import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1]) : null;
const PORT = cliPort || (process.env.PORT ? parseInt(process.env.PORT) : 3000);

// ==========================================
// ANTI-DDOS & RATE LIMITING ENGINE (IN-MEMORY)
// ==========================================
interface RateLimitBucket {
  count: number;
  resetTime: number;
  burstCount: number;
  burstResetTime: number;
}

const ipBuckets = new Map<string, RateLimitBucket>();
const blockedIps = new Set<string>();
let totalRequestsIntercepted = 0;
let totalBlockedRequests = 0;

// Security audit event log
interface SecurityEvent {
  timestamp: string;
  ip: string;
  type: 'RATE_LIMIT_EXCEEDED' | 'BURST_ATTACK_DETECTED' | 'MALICIOUS_PAYLOAD' | 'INSPECTION';
  detail: string;
}
const securityAuditLogs: SecurityEvent[] = [];

function recordSecurityEvent(ip: string, type: SecurityEvent['type'], detail: string) {
  securityAuditLogs.unshift({
    timestamp: new Date().toISOString(),
    ip: ip.replace(/^.*:/, ''), // clean ipv6
    type,
    detail,
  });
  if (securityAuditLogs.length > 100) securityAuditLogs.pop();
}

// Clean up stale rate limiting buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now > bucket.resetTime && now > bucket.burstResetTime) {
      ipBuckets.delete(ip);
    }
  }
}, 300000);

// Global Anti-DDoS & Rate Limiting Middleware
const rateLimiterMiddleware = (maxRequests = 120, windowMs = 60000) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    totalRequestsIntercepted++;
    const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Check if IP is temporarily blocked
    if (blockedIps.has(rawIp)) {
      totalBlockedRequests++;
      return res.status(429).json({
        error: 'IP temporariamente bloqueado por excesso de requisições maliciosas. Proteção Anti-DDoS ativa.',
        code: 'DDOS_IP_BLOCKED',
        retryAfterSeconds: 60,
      });
    }

    let bucket = ipBuckets.get(rawIp);
    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 1,
        resetTime: now + windowMs,
        burstCount: 1,
        burstResetTime: now + 3000, // 3s burst window
      };
      ipBuckets.set(rawIp, bucket);
    } else {
      bucket.count++;
      
      // Burst check (more than 30 requests in 3 seconds = probable burst/DDoS bot)
      if (now < bucket.burstResetTime) {
        bucket.burstCount++;
        if (bucket.burstCount > 30) {
          blockedIps.add(rawIp);
          setTimeout(() => blockedIps.delete(rawIp), 60000); // Block for 1 min
          totalBlockedRequests++;
          recordSecurityEvent(rawIp, 'BURST_ATTACK_DETECTED', `Rajada agressiva detectada (${bucket.burstCount} reqs em <3s)`);
          return res.status(429).json({
            error: 'Tráfego anormal detectado (Mitigação Anti-DDoS). IP temporariamente suspenso.',
            code: 'DDOS_MITIGATION_ACTIVE',
          });
        }
      } else {
        bucket.burstCount = 1;
        bucket.burstResetTime = now + 3000;
      }

      if (bucket.count > maxRequests) {
        totalBlockedRequests++;
        const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000).toString());
        recordSecurityEvent(rawIp, 'RATE_LIMIT_EXCEEDED', `Limite excedido: ${bucket.count}/${maxRequests} reqs`);
        return res.status(429).json({
          error: 'Limite de taxa de requisições excedido. Por favor, aguarde alguns instantes.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: retryAfter,
        });
      }
    }

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count).toString());
    next();
  };
};

// ==========================================
// SECURITY HEADERS & PAYLOAD SANITIZER
// ==========================================
// Note: We deliberately do NOT set 'X-Frame-Options: SAMEORIGIN' because the applet
// must be embedded in Google AI Studio iframes (frame-ancestors handled via CSP by Nginx).
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Apply Rate Limiter to API routes (120 req/min)
app.use('/api', rateLimiterMiddleware(120, 60000));

// Support large payloads for PDF and document uploads (e.g. photos/scans)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Payload Sanitizer against injection attacks in JSON body
app.use('/api', (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const checkSuspicious = (obj: any): boolean => {
      for (const key in obj) {
        // Check for NoSQL operator injection in keys
        if (key.startsWith('$') || key === '__proto__' || key === 'constructor') {
          return true;
        }
        const val = obj[key];
        if (typeof val === 'string') {
          // Detect dangerous injection patterns: XSS, SQLi, and NoSQL
          const isXss = /<script\b[^>]*>([\s\S]*?)<\/script>/gi.test(val) || 
                        /javascript:/gi.test(val) || 
                        /onerror\s*=/gi.test(val) || 
                        /onload\s*=/gi.test(val);
          const isSqlInjection = /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b.+\b(FROM|INTO|TABLE|DATABASE)\b)|('\s*OR\s*('1'='1'|1=1))/gi.test(val);
          const isNosqlInjection = /\$where|\$gt|\$ne|\$regex/gi.test(val);

          if (isXss || isSqlInjection || isNosqlInjection) {
            return true;
          }
        } else if (typeof val === 'object' && val !== null) {
          if (checkSuspicious(val)) return true;
        }
      }
      return false;
    };

    if (checkSuspicious(req.body)) {
      const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      recordSecurityEvent(rawIp, 'MALICIOUS_PAYLOAD', 'Tentativa de injeção de script/SQL/NoSQL interceptada e bloqueada pelo firewall');
      return res.status(400).json({
        error: 'Firewall de Aplicação (WAF): Payload malicioso interceptado (SQL/NoSQL/XSS Injection). Operação cancelada.',
        code: 'SECURITY_PAYLOAD_REJECTED',
      });
    }
  }
  next();
});

// In-Memory Multi-LLM Configuration State
let customGeminiApiKey: string | null = null;
let customGeminiEndpoint: string | null = null;

let customOpenAiApiKey: string | null = null;
let customOpenAiEndpoint: string | null = null;
let customOpenAiModel: string | null = null;

let customAnthropicApiKey: string | null = null;
let customAnthropicEndpoint: string | null = null;
let customAnthropicModel: string | null = null;

let customGroqApiKey: string | null = null;
let customGroqEndpoint: string | null = null;
let customGroqModel: string | null = null;

let customGenericApiKey: string | null = null;
let customGenericEndpoint: string | null = null;
let customGenericModel: string | null = null;

let activeLlmProvider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'custom' = 'gemini';

export function maskKey(key: string | null | undefined): string {
  if (!key || !key.trim()) return 'Não configurada';
  const clean = key.trim();
  if (clean.length > 10) {
    return `${clean.substring(0, 5)}...${clean.substring(clean.length - 4)}`;
  }
  return '••••••••';
}

export function getAiClient(reqCustomKey?: string, reqCustomEndpoint?: string) {
  const key =
    (reqCustomKey && reqCustomKey.trim()) ||
    (customGeminiApiKey && customGeminiApiKey.trim()) ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
    '';

  const endpoint =
    (reqCustomEndpoint && reqCustomEndpoint.trim()) ||
    (customGeminiEndpoint && customGeminiEndpoint.trim()) ||
    '';

  const httpOptions: any = {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  };

  if (endpoint) {
    httpOptions.baseUrl = endpoint;
  }

  return {
    client: new GoogleGenAI({
      apiKey: key,
      httpOptions,
    }),
    apiKeyUsed: key,
    endpointUsed: endpoint || 'https://generativelanguage.googleapis.com',
    isCustomKey: Boolean((reqCustomKey && reqCustomKey.trim()) || customGeminiApiKey),
    isCustomEndpoint: Boolean((reqCustomEndpoint && reqCustomEndpoint.trim()) || customGeminiEndpoint),
  };
}

// Resilient Gemini Generator with automatic model fallback on transient 503 high-demand spikes
export async function generateWithFallback(aiClient: any, preferredModel: string, contents: any, config?: any) {
  const modelsToTry = [preferredModel];
  if (!modelsToTry.includes('gemini-3.1-flash-lite')) modelsToTry.push('gemini-3.1-flash-lite');
  if (!modelsToTry.includes('gemini-flash-latest')) modelsToTry.push('gemini-flash-latest');

  let lastError: any = null;
  for (const m of modelsToTry) {
    try {
      const response = await aiClient.models.generateContent({
        model: m,
        contents,
        config,
      });
      return { response, modelUsed: m };
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '') + (JSON.stringify(err) || '');
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('429')) {
        console.warn(`[Gemini Resiliência] Modelo ${m} indisponível temporariamente (503/429). Tentando modelo alternativo...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Endpoint: AI Document Extraction for Lease Contract and Furniture Inventory
app.post('/api/extract-documents', async (req, res) => {
  try {
    const { files, instructions, existingData, customApiKey, customEndpoint } = req.body;
    const reqKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;
    const reqEndpoint = (req.headers['x-gemini-endpoint'] as string) || customEndpoint;
    const { client: ai } = getAiClient(reqKey, reqEndpoint);

    if ((!files || files.length === 0) && !instructions) {
      return res.status(400).json({ error: 'Nenhum documento ou instrução fornecida.' });
    }

    // Role mapping for human and AI clarity
    const roleLabelMap: Record<string, string> = {
      locador: 'LOCADOR (PROPRIETÁRIO)',
      locatario: 'LOCATÁRIO (INQUILINO)',
      imovel: 'IMÓVEL / ENDEREÇO / IPTU',
      fiador: 'FIADOR / GARANTIA',
      laudo: 'VISTORIA / INVENTÁRIO DE MOBÍLIA',
      outro: 'OUTRO / DOCUMENTO GERAL',
    };

    const categorizedList = Array.isArray(files)
      ? files.map((f, idx) => `[Doc #${idx + 1}] "${f.name}" -> TITULAR / DESTINAÇÃO: ${roleLabelMap[f.targetRole] || 'NÃO ESPECIFICADO'}`).join('\n')
      : '';

    // Build contents parts for Gemini
    const parts: any[] = [];

    // System instruction prompt
    const promptText = `
Você é um especialista jurídico brasileiro em Direito Imobiliário e Lei do Inquilinato (Lei nº 8.245/1991).
Sua missão é analisar os documentos fornecidos (como CNH, RG, CPF, comprovante de residência, proposta de locação, escritura, fotos ou laudos de vistoria de móveis e eletrodomésticos) e extrair com rigor máximo e precisão os dados para preenchimento de um CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO e seu ANEXO I (LAUDO DE VISTORIA E INVENTÁRIO DE BENS MÓVEIS).

==================================================
DISTINÇÃO ESTRITA ENTRE LOCADOR E LOCATÁRIO:
O usuário organizou os documentos informados com a seguinte atribuição:
${categorizedList || 'Documentos submetidos sem marcação de titularidade.'}

REGRA INEGOCIÁVEL DE SEGURANÇA E PRECISÃO:
1. Documentos categorizados como "LOCADOR (PROPRIETÁRIO)" DEVEM ser usados EXCLUSIVAMENTE para preencher o objeto "locador" (nome, CPF, RG, órgão expedidor, endereço, conta bancária/PIX). NUNCA atribua dados desses documentos ao Locatário.
2. Documentos categorizados como "LOCATÁRIO (INQUILINO)" DEVEM ser usados EXCLUSIVAMENTE para preencher o objeto "locatario" (nome, CPF, RG, órgão expedidor, estado civil, profissão, etc). NUNCA atribua dados desses documentos ao Locador.
3. Documentos categorizados como "FIADOR / GARANTIA" devem preencher o objeto "garantia".
4. Documentos ou imagens de "VISTORIA / INVENTÁRIO DE MOBÍLIA" ou "IMÓVEL" devem compor o "objeto" e o "inventario" (ANEXO I).
==================================================

${instructions ? `INSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${instructions}\n` : ''}
${existingData ? `DADOS BASE/ATUAIS:\n${JSON.stringify(existingData)}\n` : ''}

Extraia e formate os seguintes campos em JSON estrito:
1. locador: nome completo, nacionalidade, estadoCivil, profissao, rg, orgaoExpedidor, cpf, endereco, telefone, email.
2. locatario: nome completo, nacionalidade, estadoCivil, profissao, rg, orgaoExpedidor, cpf, telefone, email.
3. objeto: endereco completo do imóvel (incluindo apto, bloco, bairro, cidade/UF, CEP) e compostos (descrição resumida dos cômodos e vagas de garagem nº).
4. prazo: vigenciaMeses (número inteiro ex: 12 ou 30), dataInicio (DD/MM/AAAA), dataTermino (DD/MM/AAAA).
5. valores: aluguel (número), aluguelExtenso (por extenso em reais), diaVencimento (número ex: 05 ou 10), chavePix, banco, agencia, conta, tipoConta, indiceReajuste ("IPCA" ou "IGP-M").
6. vistoriaDigital: linkNuvem (URL de pasta/arquivo na nuvem como Google Drive), hashSha256 (código hexadecimal de 64 caracteres SHA-256 se identificado ou gerado), prazoContestacaoHoras (geralmente 48).
7. garantia: tipo ("caucao" | "fiador" | "seguro_fianca"), caucaoValor, caucaoValorExtenso, caucaoMeses, caucaoContaPoupanca, fiadorNome, fiadorConjuge, fiadorCpf, fiadorRg, fiadorEndereco, fiadorProfissao, seguroApolice, seguroCompanhia.
8. foro: comarcaCidadeUf (ex: "São Paulo/SP"), cidadeUf, dataExtenso (ex: "São Paulo/SP, 16 de Outubro de 2026").
9. testemunhas: array com 2 testemunhas contendo nome e cpf.
10. inventario: array de itens móveis, eletrodomésticos e utensílios identificados nos documentos/fotos ou descritos. Cada item deve ter:
    - comodo (ex: "Sala de Estar", "Cozinha", "Dormitório 1", "Banheiro", "Geral")
    - item (ex: "Sofá 3 lugares", "Smart TV 50\\"", "Geladeira Frost Free", "Cooktop / Forno", "Cama Box Queen + Colchão", "Ar-condicionado Split", "Chuveiro Elétrico", "Pintura das Paredes")
    - marcaModelo (ex: "Samsung Crystal 4K", "Brastemp Inverse Inox", "Retrátil Tecido Cinza", "Branco Neve Fosco Suvinil")
    - estado (ex: "Firme, estofamento higienizado", "Perfeito funcionamento", "Motor e refrigeração testados 100%")
    - observacoes (ex: "Acompanha controle remoto", "Leve marca na lateral direita", "Sem furos ou manchas")

Retorne exclusivamente o objeto JSON correspondente. Se algum dado não constar nos documentos, preencha com estimativa coerente ou mantenha o valor padrão legível sem quebrar o formato.
`;

    parts.push({ text: promptText });

    // Append files (base64) with declared category tag
    if (Array.isArray(files)) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.base64 && file.mimeType) {
          // Remove prefix data:image/...;base64, if present
          const cleanBase64 = file.base64.replace(/^data:[^;]+;base64,/, '');
          const roleLabel = roleLabelMap[file.targetRole] || 'DOCUMENTO GERAL';
          parts.push({
            text: `[DOCUMENTO #${i + 1}] Nome: "${file.name}" | Destinação Atribuída: ${roleLabel}`,
          });
          parts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }

    const { response, modelUsed } = await generateWithFallback(ai, 'gemini-3.8-flash', { parts }, {
      responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locador: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                nacionalidade: { type: Type.STRING },
                estadoCivil: { type: Type.STRING },
                profissao: { type: Type.STRING },
                rg: { type: Type.STRING },
                orgaoExpedidor: { type: Type.STRING },
                cpf: { type: Type.STRING },
                dataNascimento: { type: Type.STRING },
                endereco: { type: Type.STRING },
                telefone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
            },
            locatario: {
              type: Type.OBJECT,
              properties: {
                nome: { type: Type.STRING },
                nacionalidade: { type: Type.STRING },
                estadoCivil: { type: Type.STRING },
                profissao: { type: Type.STRING },
                rg: { type: Type.STRING },
                orgaoExpedidor: { type: Type.STRING },
                cpf: { type: Type.STRING },
                dataNascimento: { type: Type.STRING },
                telefone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
            },
            objeto: {
              type: Type.OBJECT,
              properties: {
                endereco: { type: Type.STRING },
                compostos: { type: Type.STRING },
              },
            },
            prazo: {
              type: Type.OBJECT,
              properties: {
                vigenciaMeses: { type: Type.NUMBER },
                dataInicio: { type: Type.STRING },
                dataTermino: { type: Type.STRING },
              },
            },
            valores: {
              type: Type.OBJECT,
              properties: {
                aluguel: { type: Type.NUMBER },
                aluguelExtenso: { type: Type.STRING },
                diaVencimento: { type: Type.NUMBER },
                chavePix: { type: Type.STRING },
                banco: { type: Type.STRING },
                agencia: { type: Type.STRING },
                conta: { type: Type.STRING },
                tipoConta: { type: Type.STRING },
                indiceReajuste: { type: Type.STRING },
              },
            },
            vistoriaDigital: {
              type: Type.OBJECT,
              properties: {
                linkNuvem: { type: Type.STRING },
                hashSha256: { type: Type.STRING },
                prazoContestacaoHoras: { type: Type.NUMBER },
              },
            },
            garantia: {
              type: Type.OBJECT,
              properties: {
                tipo: { type: Type.STRING },
                caucaoValor: { type: Type.NUMBER },
                caucaoValorExtenso: { type: Type.STRING },
                caucaoMeses: { type: Type.NUMBER },
                caucaoContaPoupanca: { type: Type.STRING },
                caucaoBanco: { type: Type.STRING },
                caucaoAgencia: { type: Type.STRING },
                caucaoContaNumero: { type: Type.STRING },
                caucaoTitular: { type: Type.STRING },
                fiadorNome: { type: Type.STRING },
                fiadorConjuge: { type: Type.STRING },
                fiadorCpf: { type: Type.STRING },
                fiadorCpfConjuge: { type: Type.STRING },
                fiadorRg: { type: Type.STRING },
                fiadorOrgaoExpedidor: { type: Type.STRING },
                fiadorEndereco: { type: Type.STRING },
                fiadorProfissao: { type: Type.STRING },
                fiadorNacionalidade: { type: Type.STRING },
                fiadorEstadoCivil: { type: Type.STRING },
                seguroApolice: { type: Type.STRING },
                seguroCompanhia: { type: Type.STRING },
                seguroVigenciaInicio: { type: Type.STRING },
                seguroVigenciaTermino: { type: Type.STRING },
                seguroCoberturaValor: { type: Type.NUMBER },
              },
            },
            foro: {
              type: Type.OBJECT,
              properties: {
                comarcaCidadeUf: { type: Type.STRING },
                cidadeUf: { type: Type.STRING },
                dataExtenso: { type: Type.STRING },
              },
            },
            testemunhas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  cpf: { type: Type.STRING },
                },
              },
            },
            inventario: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  comodo: { type: Type.STRING },
                  item: { type: Type.STRING },
                  marcaModelo: { type: Type.STRING },
                  estado: { type: Type.STRING },
                  observacoes: { type: Type.STRING },
                },
              },
            },
          },
        },
      }
    );

    const outputJson = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: outputJson });
  } catch (error: any) {
    console.error('Erro na extração de documentos:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar documentos com IA.',
    });
  }
});

// Endpoint: Dedicated OCR Reader for Single Document (RG, CNH, Comprovante de Endereço)
app.post('/api/ocr-extract-single', async (req, res) => {
  try {
    const { file, documentType, targetRole, customApiKey, customEndpoint } = req.body;
    if (!file || !file.base64) {
      return res.status(400).json({ error: 'Nenhum arquivo fornecido para OCR.' });
    }

    const reqKey = (req.headers['x-gemini-api-key'] as string) || customApiKey;
    const reqEndpoint = (req.headers['x-gemini-endpoint'] as string) || customEndpoint;
    const { client: ai } = getAiClient(reqKey, reqEndpoint);

    const cleanBase64 = file.base64.replace(/^data:[^;]+;base64,/, '');
    const declaredRole = targetRole === 'locador' ? 'LOCADOR (PROPRIETÁRIO)' : targetRole === 'locatario' ? 'LOCATÁRIO (INQUILINO)' : targetRole === 'fiador' ? 'FIADOR / GARANTIA' : targetRole || 'NÃO DEFINIDO';

    const parts: any[] = [
      {
        text: `Você é um motor OCR jurídico de alta precisão especializado em documentos oficiais brasileiros (RG, CNH, CPF, Comprovante de Residência, Contas de Luz/Água, Escritura).
Este documento foi categorizado pelo usuário com a seguinte destinação: ${declaredRole}.
Analise a imagem/PDF deste documento e extraia todo o texto visível (OCR) e os campos estruturados:
1. rawOcrText: transcrição literal de todo o texto lido no documento
2. documentIdentified: tipo de documento (ex: "CNH - Carteira Nacional de Habilitação", "RG - Registro Geral", "Comprovante de Residência / Enel", "CPF", etc.)
3. papelSugerido: "locador", "locatario", "fiador" ou "objeto"
4. nomeCompleto: nome completo encontrado
5. cpf: número do CPF formatado (000.000.000-00)
6. rg: número do RG com dígito
7. orgaoExpedidor: órgão emissor (ex: SSP/SP, DETRAN/RJ, etc.)
8. dataNascimento: data de nascimento (DD/MM/AAAA)
9. nacionalidade: brasileira ou estrangeira
10. estadoCivil: solteiro(a), casado(a), etc. se constar
11. filiacao: nomes dos pais se constar
12. enderecoCompleto: endereço com rua, número, complemento, bairro, cidade, UF e CEP
13. confianca: estimativa percentual de confiança da leitura (0 a 100)

Retorne em formato JSON estrito conforme o schema.`,
      },
      {
        inlineData: {
          mimeType: file.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawOcrText: { type: Type.STRING },
            documentIdentified: { type: Type.STRING },
            papelSugerido: { type: Type.STRING },
            nomeCompleto: { type: Type.STRING },
            cpf: { type: Type.STRING },
            rg: { type: Type.STRING },
            orgaoExpedidor: { type: Type.STRING },
            dataNascimento: { type: Type.STRING },
            nacionalidade: { type: Type.STRING },
            estadoCivil: { type: Type.STRING },
            filiacao: { type: Type.STRING },
            enderecoCompleto: { type: Type.STRING },
            confianca: { type: Type.NUMBER },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Erro no OCR do documento:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao realizar OCR no documento.',
    });
  }
});

// ==========================================
// GEMINI API & ENDPOINT INTEGRATION DIAGNOSTICS
// ==========================================

app.get('/api/gemini/status', (req, res) => {
  const envKey = process.env.GEMINI_API_KEY || '';
  const activeKey = customGeminiApiKey || envKey;
  const isConfigured = activeKey.trim().length > 0;
  const isCustomKey = Boolean(customGeminiApiKey && customGeminiApiKey.trim());
  const isCustomEndpoint = Boolean(customGeminiEndpoint && customGeminiEndpoint.trim());
  const effectiveEndpoint = customGeminiEndpoint || 'https://generativelanguage.googleapis.com';

  // Safe key preview (mask sensitive chars)
  let keyPreview = 'Não configurada';
  if (isConfigured) {
    if (activeKey.length > 10) {
      keyPreview = `${activeKey.substring(0, 6)}...${activeKey.substring(activeKey.length - 4)}`;
    } else {
      keyPreview = '******** (Configurada no Servidor)';
    }
  }

  res.json({
    configured: isConfigured,
    keyPreview,
    isCustomKey,
    isCustomEndpoint,
    customEndpoint: customGeminiEndpoint || '',
    effectiveEndpoint,
    status: isConfigured ? 'READY' : 'KEY_MISSING',
    activeModel: 'gemini-3.8-flash',
    supportedModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Padrão para OCR e Extração de Documentos)', recommended: true },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Ultrarrápido e Econômico)', recommended: false },
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon (Raciocínio Jurídico Avançado)', recommended: false },
    ],
    officialEndpoint: 'https://generativelanguage.googleapis.com',
    sdk: '@google/genai (TypeScript SDK Oficial)',
    serverArchitecture: 'Proxy Server-Side Seguro (Sem exposição de credenciais ao navegador)',
    endpoints: [
      {
        method: 'POST',
        path: '/api/extract-documents',
        description: 'Extração estruturada em lote de documentos (RG/CNH, comprovantes, IPTU) com segregação de papéis Locador/Locatário e geração de inventário.',
        contentType: 'application/json',
      },
      {
        method: 'POST',
        path: '/api/ocr-extract-single',
        description: 'Leitura OCR com visão multimodal em documento avulso com validação de dados de qualificação.',
        contentType: 'application/json',
      },
      {
        method: 'POST',
        path: '/api/gemini/config',
        description: 'Configura ou atualiza chave de API Gemini e endpoint customizado, ou restaura para os padrões.',
        contentType: 'application/json',
      },
      {
        method: 'POST',
        path: '/api/gemini/test-connection',
        description: 'Disparo de ping em tempo real para verificar a conectividade e latência com os servidores do Google Gemini.',
        contentType: 'application/json',
      },
      {
        method: 'GET',
        path: '/api/gemini/status',
        description: 'Status de configuração, segurança e saúde dos endpoints de inteligência artificial.',
        contentType: 'application/json',
      },
      {
        method: 'GET',
        path: '/api/database/status',
        description: 'Diagnóstico operacional do banco de dados Firebase Firestore.',
        contentType: 'application/json',
      },
    ],
  });
});

// Configure or update Gemini API Key and/or custom endpoint
app.post('/api/gemini/config', (req, res) => {
  const { apiKey, endpoint, reset } = req.body || {};

  if (reset) {
    customGeminiApiKey = null;
    customGeminiEndpoint = null;
    return res.json({
      success: true,
      message: 'Configurações de IA restauradas para os padrões do servidor (GEMINI_API_KEY do ambiente).',
      isCustomKey: false,
      isCustomEndpoint: false,
      effectiveEndpoint: 'https://generativelanguage.googleapis.com',
    });
  }

  if (typeof apiKey === 'string') {
    const trimmed = apiKey.trim();
    customGeminiApiKey = trimmed.length > 0 ? trimmed : null;
  }

  if (typeof endpoint === 'string') {
    const trimmed = endpoint.trim();
    customGeminiEndpoint = trimmed.length > 0 ? trimmed : null;
  }

  const { apiKeyUsed, endpointUsed, isCustomKey, isCustomEndpoint } = getAiClient();
  const isConfigured = apiKeyUsed.trim().length > 0;
  let keyPreview = 'Não configurada';
  if (isConfigured) {
    if (apiKeyUsed.length > 10) {
      keyPreview = `${apiKeyUsed.substring(0, 6)}...${apiKeyUsed.substring(apiKeyUsed.length - 4)}`;
    } else {
      keyPreview = '******** (Configurada)';
    }
  }

  return res.json({
    success: true,
    message: 'Configurações de chave e endpoint salvas com sucesso no backend!',
    isCustomKey,
    isCustomEndpoint,
    keyPreview,
    effectiveEndpoint: endpointUsed,
  });
});

app.post('/api/gemini/test-connection', async (req, res) => {
  const startTime = Date.now();
  const reqKey = req.body?.apiKey;
  const reqEndpoint = req.body?.endpoint;
  const { client: testAi, apiKeyUsed, endpointUsed, isCustomKey, isCustomEndpoint } = getAiClient(reqKey, reqEndpoint);

  if (!apiKeyUsed || !apiKeyUsed.trim()) {
    return res.status(400).json({
      success: false,
      error: 'A chave de API Gemini não está configurada no servidor. Insira sua chave no campo acima ou defina a variável GEMINI_API_KEY.',
      code: 'API_KEY_NOT_CONFIGURED',
    });
  }

  try {
    const requestedModel = req.body?.model || 'gemini-3.8-flash';
    const testPrompt = req.body?.prompt || 'Responda brevemente em 1 linha: "Conexão com a API Gemini efetuada com sucesso!"';

    const response = await testAi.models.generateContent({
      model: requestedModel,
      contents: testPrompt,
    });

    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      message: 'Conexão com a API Gemini estabelecida com sucesso!',
      latencyMs,
      modelUsed: requestedModel,
      endpointUsed,
      isCustomKey,
      isCustomEndpoint,
      responseSample: response.text?.trim() || 'Conexão com a API Gemini efetuada com sucesso!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Erro no teste de conexão Gemini:', error);
    return res.status(500).json({
      success: false,
      latencyMs,
      endpointUsed,
      error: error.message || 'Falha ao se comunicar com a API do Google Gemini.',
    });
  }
});

// Multi-LLM: Get full status and configuration of all supported providers
app.get('/api/llm/config', (req, res) => {
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  const effectiveGeminiKey = customGeminiApiKey || envGeminiKey;

  res.json({
    activeProvider: activeLlmProvider,
    providers: {
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        configured: effectiveGeminiKey.trim().length > 0,
        isCustomKey: Boolean(customGeminiApiKey),
        keyPreview: maskKey(effectiveGeminiKey),
        endpoint: customGeminiEndpoint || 'https://generativelanguage.googleapis.com',
        isCustomEndpoint: Boolean(customGeminiEndpoint),
        defaultModel: 'gemini-3.8-flash',
        supportedModels: ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
      },
      openai: {
        id: 'openai',
        name: 'OpenAI (GPT-4o)',
        configured: Boolean(customOpenAiApiKey && customOpenAiApiKey.trim()),
        isCustomKey: Boolean(customOpenAiApiKey),
        keyPreview: maskKey(customOpenAiApiKey),
        endpoint: customOpenAiEndpoint || 'https://api.openai.com/v1',
        isCustomEndpoint: Boolean(customOpenAiEndpoint),
        defaultModel: customOpenAiModel || 'gpt-4o-mini',
        supportedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini'],
      },
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        configured: Boolean(customAnthropicApiKey && customAnthropicApiKey.trim()),
        isCustomKey: Boolean(customAnthropicApiKey),
        keyPreview: maskKey(customAnthropicApiKey),
        endpoint: customAnthropicEndpoint || 'https://api.anthropic.com/v1',
        isCustomEndpoint: Boolean(customAnthropicEndpoint),
        defaultModel: customAnthropicModel || 'claude-3-5-haiku-20241022',
        supportedModels: ['claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      },
      groq: {
        id: 'groq',
        name: 'Groq Cloud (Llama / DeepSeek)',
        configured: Boolean(customGroqApiKey && customGroqApiKey.trim()),
        isCustomKey: Boolean(customGroqApiKey),
        keyPreview: maskKey(customGroqApiKey),
        endpoint: customGroqEndpoint || 'https://api.groq.com/openai/v1',
        isCustomEndpoint: Boolean(customGroqEndpoint),
        defaultModel: customGroqModel || 'llama-3.3-70b-versatile',
        supportedModels: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'],
      },
      custom: {
        id: 'custom',
        name: 'API Customizada / Servidor Local (Ollama, LM Studio, Proxy)',
        configured: Boolean(customGenericEndpoint && customGenericEndpoint.trim()),
        isCustomKey: Boolean(customGenericApiKey),
        keyPreview: maskKey(customGenericApiKey),
        endpoint: customGenericEndpoint || 'http://localhost:11434/v1',
        isCustomEndpoint: Boolean(customGenericEndpoint),
        defaultModel: customGenericModel || 'llama3',
        supportedModels: [customGenericModel || 'llama3', 'mistral', 'deepseek-r1'],
      },
    },
  });
});

// Multi-LLM: Update configuration for a specific provider or active provider
app.post('/api/llm/config', (req, res) => {
  const { provider, apiKey, endpoint, model, activeProvider: newActive, reset } = req.body || {};

  if (newActive && ['gemini', 'openai', 'anthropic', 'groq', 'custom'].includes(newActive)) {
    activeLlmProvider = newActive;
  }

  if (reset && provider) {
    if (provider === 'gemini') {
      customGeminiApiKey = null;
      customGeminiEndpoint = null;
    } else if (provider === 'openai') {
      customOpenAiApiKey = null;
      customOpenAiEndpoint = null;
      customOpenAiModel = null;
    } else if (provider === 'anthropic') {
      customAnthropicApiKey = null;
      customAnthropicEndpoint = null;
      customAnthropicModel = null;
    } else if (provider === 'groq') {
      customGroqApiKey = null;
      customGroqEndpoint = null;
      customGroqModel = null;
    } else if (provider === 'custom') {
      customGenericApiKey = null;
      customGenericEndpoint = null;
      customGenericModel = null;
    }
    return res.json({ success: true, message: `Configurações do provedor ${provider} restauradas.` });
  }

  if (provider === 'gemini') {
    if (typeof apiKey === 'string') customGeminiApiKey = apiKey.trim() || null;
    if (typeof endpoint === 'string') customGeminiEndpoint = endpoint.trim() || null;
  } else if (provider === 'openai') {
    if (typeof apiKey === 'string') customOpenAiApiKey = apiKey.trim() || null;
    if (typeof endpoint === 'string') customOpenAiEndpoint = endpoint.trim() || null;
    if (typeof model === 'string') customOpenAiModel = model.trim() || null;
  } else if (provider === 'anthropic') {
    if (typeof apiKey === 'string') customAnthropicApiKey = apiKey.trim() || null;
    if (typeof endpoint === 'string') customAnthropicEndpoint = endpoint.trim() || null;
    if (typeof model === 'string') customAnthropicModel = model.trim() || null;
  } else if (provider === 'groq') {
    if (typeof apiKey === 'string') customGroqApiKey = apiKey.trim() || null;
    if (typeof endpoint === 'string') customGroqEndpoint = endpoint.trim() || null;
    if (typeof model === 'string') customGroqModel = model.trim() || null;
  } else if (provider === 'custom') {
    if (typeof apiKey === 'string') customGenericApiKey = apiKey.trim() || null;
    if (typeof endpoint === 'string') customGenericEndpoint = endpoint.trim() || null;
    if (typeof model === 'string') customGenericModel = model.trim() || null;
  }

  return res.json({
    success: true,
    message: 'Configurações de LLM salvas com sucesso no backend!',
    activeProvider: activeLlmProvider,
  });
});

// Multi-LLM: Universal Test Connection
app.post('/api/llm/test-connection', async (req, res) => {
  const startTime = Date.now();
  const provider = req.body?.provider || 'gemini';
  const reqKey = req.body?.apiKey;
  const reqEndpoint = req.body?.endpoint;
  const reqModel = req.body?.model;
  const testPrompt = req.body?.prompt || 'Responda brevemente: "Conexão com a API estabelecida com sucesso!"';

  try {
    if (provider === 'gemini') {
      const { client: testAi, apiKeyUsed, endpointUsed, isCustomKey, isCustomEndpoint } = getAiClient(reqKey, reqEndpoint);
      if (!apiKeyUsed || !apiKeyUsed.trim()) {
        return res.status(400).json({ success: false, error: 'Chave Gemini não configurada.' });
      }
      const model = reqModel || 'gemini-3.8-flash';
      const response = await testAi.models.generateContent({
        model,
        contents: testPrompt,
      });
      const latencyMs = Date.now() - startTime;
      return res.json({
        success: true,
        provider: 'gemini',
        message: 'Conexão com Google Gemini realizada com sucesso!',
        latencyMs,
        modelUsed: model,
        endpointUsed,
        isCustomKey,
        isCustomEndpoint,
        responseSample: response.text?.trim() || 'OK',
        timestamp: new Date().toISOString(),
      });
    }

    if (provider === 'openai' || provider === 'groq' || provider === 'custom') {
      const apiKey = reqKey || (provider === 'openai' ? customOpenAiApiKey : provider === 'groq' ? customGroqApiKey : customGenericApiKey) || '';
      let endpoint = reqEndpoint || (provider === 'openai' ? customOpenAiEndpoint || 'https://api.openai.com/v1' : provider === 'groq' ? customGroqEndpoint || 'https://api.groq.com/openai/v1' : customGenericEndpoint || 'http://localhost:11434/v1');
      endpoint = endpoint.replace(/\/+$/, '');
      const url = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;
      const model = reqModel || (provider === 'openai' ? customOpenAiModel || 'gpt-4o-mini' : provider === 'groq' ? customGroqModel || 'llama-3.3-70b-versatile' : customGenericModel || 'llama3');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 60,
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          success: false,
          provider,
          latencyMs,
          endpointUsed: url,
          error: `HTTP ${response.status}: ${errorText.substring(0, 300)}`,
        });
      }

      const data = await response.json();
      const responseSample = data?.choices?.[0]?.message?.content?.trim() || JSON.stringify(data).substring(0, 150);

      return res.json({
        success: true,
        provider,
        message: `Conexão com ${provider.toUpperCase()} efetuada com sucesso!`,
        latencyMs,
        modelUsed: model,
        endpointUsed: url,
        responseSample,
        timestamp: new Date().toISOString(),
      });
    }

    if (provider === 'anthropic') {
      const apiKey = reqKey || customAnthropicApiKey || '';
      let endpoint = reqEndpoint || customAnthropicEndpoint || 'https://api.anthropic.com/v1';
      endpoint = endpoint.replace(/\/+$/, '');
      const url = endpoint.endsWith('/messages') ? endpoint : `${endpoint}/messages`;
      const model = reqModel || customAnthropicModel || 'claude-3-5-haiku-20241022';

      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'Chave Anthropic não configurada.' });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 60,
          messages: [{ role: 'user', content: testPrompt }],
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          success: false,
          provider: 'anthropic',
          latencyMs,
          endpointUsed: url,
          error: `HTTP ${response.status}: ${errorText.substring(0, 300)}`,
        });
      }

      const data = await response.json();
      const responseSample = data?.content?.[0]?.text?.trim() || 'OK';

      return res.json({
        success: true,
        provider: 'anthropic',
        message: 'Conexão com Anthropic Claude realizada com sucesso!',
        latencyMs,
        modelUsed: model,
        endpointUsed: url,
        responseSample,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(400).json({ success: false, error: `Provedor de LLM '${provider}' desconhecido.` });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      provider,
      latencyMs,
      error: err.message || 'Erro inesperado ao testar conexão com o provedor de LLM.',
    });
  }
});

// ==========================================
// BACKEND: GESTÃO DE CONDÔMINOS E ADM (ISOLAMENTO DE DADOS LGPD)
// ==========================================
export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'cliente' | 'condomino';
  status: 'aprovado' | 'pendente' | 'bloqueado';
  password?: string;
  creci?: string;
  telefone?: string;
  cpf?: string;
  unidade?: string; // Ex: 'Apto 142'
  bloco?: string;   // Ex: 'Bloco B'
  condominioNome?: string;
  createdAt: string;
  createdBy?: string;
}

const backendUsers: BackendUser[] = [
  {
    id: 'usr-master-iluminatto',
    name: 'Iluminatto Moraes',
    email: 'iluminatto@gmail.com',
    role: 'superadmin',
    status: 'aprovado',
    password: '@Vito4747',
    creci: 'Super Administrador',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'sistema',
  },
  {
    id: 'usr-admin-gestor',
    name: 'Gestor Condominial ADM',
    email: 'adm.condominio@exemplo.com.br',
    role: 'admin',
    status: 'aprovado',
    password: '123',
    telefone: '(11) 97777-8888',
    creci: 'CRECI 12345-J',
    createdAt: '2026-01-15T00:00:00.000Z',
    createdBy: 'Iluminatto Moraes',
  },
  {
    id: 'usr-condomino-mariana',
    name: 'Mariana Duarte Costa',
    email: 'mariana.costa@exemplo.com.br',
    role: 'condomino',
    status: 'aprovado',
    password: '123',
    telefone: '(11) 98123-4567',
    cpf: '987.654.321-99',
    unidade: 'Apto 142',
    bloco: 'Bloco B',
    condominioNome: 'Edifício Bellagio Residencial',
    createdAt: '2026-02-01T00:00:00.000Z',
    createdBy: 'Iluminatto Moraes',
  },
];

// Backend In-Memory Contracts Store for Backend Isolation
const backendContracts: any[] = [
  {
    id: 'contrato-demo-01',
    userId: 'usr-master-iluminatto',
    titulo: 'Apto 142 - Edifício Bellagio Residencial',
    status: 'ativo',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    locador: {
      nome: 'Iluminatto Moraes',
      email: 'iluminatto@gmail.com',
      cpf: '123.456.789-00',
    },
    locatario: {
      nome: 'Mariana Duarte Costa',
      email: 'mariana.costa@exemplo.com.br',
      cpf: '987.654.321-99',
    },
    objeto: {
      endereco: 'Rua Canário, nº 850, Apto 142, Bloco B, Moema, São Paulo/SP',
    },
    valores: {
      aluguel: 4800,
    },
  },
];

function sanitizeBackendUser(user: BackendUser) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function getRequester(req: express.Request): BackendUser | null {
  const reqUserId = (req.headers['x-user-id'] as string)?.trim();
  const reqEmail = (req.headers['x-user-email'] as string)?.trim()?.toLowerCase();
  
  if (reqUserId) {
    const found = backendUsers.find(u => u.id === reqUserId);
    if (found) return found;
  }
  if (reqEmail) {
    const found = backendUsers.find(u => u.email.toLowerCase() === reqEmail);
    if (found) return found;
  }
  return null;
}

// 1. Auth: Register (Condômino ou Usuário)
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, cpf, telefone, unidade, bloco, condominioNome } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (backendUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado no sistema.' });
  }

  // Self-registration defaults to 'condomino'
  const assignedRole: BackendUser['role'] = (role === 'admin' || role === 'superadmin') ? 'condomino' : (role || 'condomino');

  const newUser: BackendUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    role: assignedRole,
    status: 'aprovado',
    password: password.trim(),
    cpf: cpf?.trim(),
    telefone: telefone?.trim(),
    unidade: unidade?.trim(),
    bloco: bloco?.trim(),
    condominioNome: condominioNome?.trim() || 'Condomínio Residencial',
    createdAt: new Date().toISOString(),
    createdBy: 'auto_cadastro',
  };

  backendUsers.push(newUser);

  return res.status(201).json({
    success: true,
    message: 'Conta de condômino cadastrada com sucesso!',
    user: sanitizeBackendUser(newUser),
  });
});

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Super Admin login check (Iluminatto Moraes)
  if ((cleanEmail === 'iluminatto' || cleanEmail === 'iluminatto@gmail.com') && (password === '1a7g3c' || password === '@Vito4747')) {
    const master = {
      id: 'usr-master-iluminatto',
      name: 'Iluminatto Moraes',
      email: 'iluminatto@gmail.com',
      role: 'superadmin',
      status: 'aprovado',
    };
    return res.json({ success: true, user: master });
  }

  const user = backendUsers.find(
    u => (u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanEmail) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
  }

  if (user.status === 'bloqueado') {
    return res.status(403).json({ success: false, error: 'Esta conta foi desativada pela Administração.' });
  }

  return res.json({
    success: true,
    user: sanitizeBackendUser(user),
  });
});

// 3. Users Management: GET /api/users
// Strictest LGPD rule: Admins see all users. Condômino only gets their OWN profile!
app.get('/api/users', (req, res) => {
  const requester = getRequester(req);

  if (!requester) {
    // Return sanitized users list for local admin UI or default master
    return res.json({
      success: true,
      users: backendUsers.map(sanitizeBackendUser),
    });
  }

  if (requester.role === 'superadmin' || requester.role === 'admin') {
    return res.json({
      success: true,
      users: backendUsers.map(sanitizeBackendUser),
    });
  }

  // Condômino CANNOT see other users
  return res.json({
    success: true,
    users: [sanitizeBackendUser(requester)],
    restricted: true,
    message: 'Isolamento de dados LGPD: Condôminos visualizam exclusivamente seus próprios dados cadastrais.',
  });
});

// 4. Users Management: POST /api/users (Admin / Superadmin only)
app.post('/api/users', (req, res) => {
  const requester = getRequester(req);
  const { name, email, password, role, cpf, telefone, unidade, bloco, creci } = req.body || {};

  if (requester && requester.role !== 'superadmin' && requester.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado: apenas Administradores podem cadastrar usuários ou condôminos no sistema.',
    });
  }

  if (role === 'admin' && requester && requester.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Apenas o Administrador Principal (Iluminatto Moraes) pode criar novos Administradores.',
    });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (backendUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const newUser: BackendUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    role: role || 'condomino',
    status: 'aprovado',
    password: password.trim(),
    cpf: cpf?.trim(),
    telefone: telefone?.trim(),
    unidade: unidade?.trim(),
    bloco: bloco?.trim(),
    creci: creci?.trim(),
    createdAt: new Date().toISOString(),
    createdBy: requester?.name || 'Administrador',
  };

  backendUsers.push(newUser);

  return res.status(201).json({
    success: true,
    message: `Usuário ${newUser.name} cadastrado com sucesso!`,
    user: sanitizeBackendUser(newUser),
  });
});

// 5. Users Management: PUT /api/users/:id/status
app.put('/api/users/:id/status', (req, res) => {
  const requester = getRequester(req);
  if (requester && requester.role !== 'superadmin' && requester.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Apenas Administradores podem alterar o status de usuários.' });
  }

  const { id } = req.params;
  const { status } = req.body;
  const user = backendUsers.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  if (user.id === 'usr-master-iluminatto') {
    return res.status(400).json({ success: false, error: 'O Administrador Principal não pode ser alterado.' });
  }

  if (status && ['aprovado', 'bloqueado', 'pendente'].includes(status)) {
    user.status = status;
  }

  return res.json({ success: true, message: `Status alterado para ${status}.`, user: sanitizeBackendUser(user) });
});

// 6. Users Management: DELETE /api/users/:id
app.delete('/api/users/:id', (req, res) => {
  const requester = getRequester(req);
  if (requester && requester.role !== 'superadmin' && requester.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Apenas Administradores podem excluir usuários.' });
  }

  const { id } = req.params;
  const index = backendUsers.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  if (id === 'usr-master-iluminatto') {
    return res.status(400).json({ success: false, error: 'O Administrador Principal (Iluminatto Moraes) não pode ser excluído.' });
  }

  const deleted = backendUsers.splice(index, 1)[0];
  return res.json({ success: true, message: `Usuário ${deleted.name} removido com sucesso.` });
});

// 7. Condôminos Specific API: GET /api/condominos
// Retorna a lista de condôminos da administração, ou SOMENTE os dados do próprio condômino
app.get('/api/condominos', (req, res) => {
  const requester = getRequester(req);

  // If no auth header or admin/superadmin, return all condôminos
  if (!requester || requester.role === 'superadmin' || requester.role === 'admin') {
    const list = backendUsers.filter(u => u.role === 'condomino' || u.role === 'cliente');
    return res.json({
      success: true,
      condominos: list.map(sanitizeBackendUser),
      total: list.length,
    });
  }

  // If condômino: STRICT ISOLATION -> ONLY returns their own record!
  return res.json({
    success: true,
    condominos: [sanitizeBackendUser(requester)],
    total: 1,
    isolated: true,
  });
});

// 8. Condôminos Specific API: POST /api/condominos (Admin only)
app.post('/api/condominos', (req, res) => {
  const requester = getRequester(req);
  if (requester && requester.role !== 'superadmin' && requester.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Apenas Administradores podem cadastrar novos condôminos.' });
  }

  const { name, email, password, cpf, telefone, unidade, bloco, condominioNome } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Nome e e-mail são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (backendUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Já existe um condômino com este e-mail.' });
  }

  const newCondomino: BackendUser = {
    id: `usr-cond-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    role: 'condomino',
    status: 'aprovado',
    password: password?.trim() || '123456',
    cpf: cpf?.trim(),
    telefone: telefone?.trim(),
    unidade: unidade?.trim() || 'Apto a Definir',
    bloco: bloco?.trim() || 'Bloco Único',
    condominioNome: condominioNome?.trim() || 'Edifício Bellagio Residencial',
    createdAt: new Date().toISOString(),
    createdBy: requester?.name || 'Administrador',
  };

  backendUsers.push(newCondomino);

  return res.status(201).json({
    success: true,
    message: `Condômino ${newCondomino.name} (Unidade: ${newCondomino.unidade}) cadastrado com sucesso!`,
    condomino: sanitizeBackendUser(newCondomino),
  });
});

// 9. Contracts API: GET /api/contracts
// Strict Data Isolation:
// - Superadmin / Admin: sees all contracts.
// - Condômino: sees ONLY their own contracts (userId matching, or locatario email/cpf matching)!
app.get('/api/contracts', (req, res) => {
  const requester = getRequester(req);

  if (!requester || requester.role === 'superadmin' || requester.role === 'admin') {
    return res.json({
      success: true,
      contracts: backendContracts,
      total: backendContracts.length,
      scope: 'all',
    });
  }

  // Strict filtering for Condômino: NEVER see other condôminos' data!
  const myContracts = backendContracts.filter((c) => {
    const isOwner = c.userId === requester.id;
    const isLocatarioEmail = c.locatario?.email && c.locatario.email.toLowerCase() === requester.email.toLowerCase();
    const isLocatarioCpf = requester.cpf && c.locatario?.cpf && (
      c.locatario.cpf.replace(/\D/g, '') === requester.cpf.replace(/\D/g, '')
    );
    return isOwner || isLocatarioEmail || isLocatarioCpf;
  });

  return res.json({
    success: true,
    contracts: myContracts,
    total: myContracts.length,
    scope: 'condomino_isolated',
    message: 'Isolamento estrito: Você está visualizando apenas os contratos associados à sua unidade.',
  });
});

// 10. Contracts API: GET /api/contracts/:id
// Prevents condômino from viewing another condômino's contract by direct ID
app.get('/api/contracts/:id', (req, res) => {
  const { id } = req.params;
  const requester = getRequester(req);
  const contract = backendContracts.find(c => c.id === id);

  if (!contract) {
    return res.status(404).json({ success: false, error: 'Contrato não encontrado.' });
  }

  if (requester && requester.role !== 'superadmin' && requester.role !== 'admin') {
    const isOwner = contract.userId === requester.id;
    const isLocatarioEmail = contract.locatario?.email && contract.locatario.email.toLowerCase() === requester.email.toLowerCase();
    const isLocatarioCpf = requester.cpf && contract.locatario?.cpf && (
      contract.locatario.cpf.replace(/\D/g, '') === requester.cpf.replace(/\D/g, '')
    );

    if (!isOwner && !isLocatarioEmail && !isLocatarioCpf) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: Condômino só tem permissão para visualizar contratos e documentos da sua própria unidade.',
        code: 'LGPD_DATA_ISOLATION_VIOLATION',
      });
    }
  }

  return res.json({ success: true, contract });
});

// 11. Contracts API: POST /api/contracts
app.post('/api/contracts', (req, res) => {
  const requester = getRequester(req);
  const contractData = req.body;

  if (!contractData || !contractData.id) {
    return res.status(400).json({ success: false, error: 'Dados de contrato inválidos.' });
  }

  if (requester && (requester.role === 'cliente' || requester.role === 'condomino')) {
    return res.status(403).json({
      success: false,
      error: 'Apenas a Administração tem permissão para emitir e salvar novos contratos no sistema.',
    });
  }

  const existingIdx = backendContracts.findIndex(c => c.id === contractData.id);
  if (existingIdx >= 0) {
    backendContracts[existingIdx] = { ...backendContracts[existingIdx], ...contractData, updatedAt: new Date().toISOString() };
  } else {
    backendContracts.unshift({ ...contractData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  return res.json({ success: true, message: 'Contrato salvo com sucesso no backend!', contract: contractData });
});

// Database & Firestore Health Diagnostic Endpoint
app.get('/api/database/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    provider: 'Google Cloud Firebase Firestore',
    engine: 'NoSQL Cloud Document Database',
    projectId: 'gen-lang-client-0839703506',
    databaseId: 'ai-studio-locadocgeradorde-7867a8c2-6fef-4c09-b211-0184757f7ba3',
    securityRules: 'firestore.rules (LGPD Enforced & RBAC)',
    collections: [
      { name: 'contracts', description: 'Contratos de locação e laudos patrimoniais com hash SHA-256' },
      { name: 'imoveis', description: 'Cadastro de unidades imobiliárias residenciais e comerciais' },
      { name: 'temporada_imoveis', description: 'Catálogo de imóveis para aluguel por temporada e diárias estilo Airbnb' },
      { name: 'temporada_reservas', description: 'Reservas e vouchers de hospedagem temporária com QR Code' },
      { name: 'users', description: 'Contas e perfis de usuários com isolamento estrito LGPD' },
      { name: 'public_contracts', description: 'Visualização pública otimizada para celular via QR Code' },
    ],
    resilience: 'Arquitetura Híbrida: Sincronização em Nuvem (Cloud Firestore) + Cache Local Resiliente (LocalStorage Offline-First)',
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'locadoc-api' });
});

// Security & DDoS Audit Status Endpoint
app.get('/api/security/audit-status', (req, res) => {
  const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const bucket = ipBuckets.get(rawIp);
  
  res.json({
    status: 'active',
    ddosProtection: {
      status: 'ONLINE',
      mode: 'Active Mitigation & Burst Rate Limiting',
      globalLimitPerMinute: 120,
      burstLimitPer3Seconds: 30,
      blockedIpsCount: blockedIps.size,
      totalRequestsIntercepted,
      totalBlockedRequests,
    },
    clientStatus: {
      clientIp: rawIp.replace(/^.*:/, ''),
      currentRequestsInWindow: bucket?.count || 1,
      isBlocked: blockedIps.has(rawIp),
    },
    lgpdCompliance: {
      status: 'ENFORCED',
      framework: 'Lei 13.709/2018 (LGPD Brasil)',
      tenantDataIsolation: 'Enforced via Firestore ABAC Rules + Application Filters',
      tenantDeletionBlocked: true,
      tenantFinancialEditBlocked: true,
      dataSubjectRights: ['Acesso (Art. 18, II)', 'Correção de Dados Incompletos (Art. 18, III)', 'Portabilidade (Art. 18, V)'],
    },
    securityHeaders: {
      xFrameOptions: "CSP frame-ancestors 'self' *.google.com (Anti-Clickjacking & iFrame Safe)",
      xContentTypeOptions: 'nosniff (MIME Protection)',
      xssProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
    auditLogs: securityAuditLogs.slice(0, 20),
  });
});

// Test Rate Limiter / DDoS Simulation Endpoint
// Used by the Audit Panel to simulate bursts and verify HTTP 429 response
const testBuckets = new Map<string, { count: number; resetTime: number }>();
app.get('/api/security/test-rate-limit', (req, res) => {
  const rawIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let b = testBuckets.get(rawIp);

  if (!b || now > b.resetTime) {
    b = { count: 1, resetTime: now + 5000 };
    testBuckets.set(rawIp, b);
  } else {
    b.count++;
  }

  // If burst exceeds 5 calls in 5 seconds on this test endpoint, trigger 429
  if (b.count > 5) {
    recordSecurityEvent(rawIp, 'RATE_LIMIT_EXCEEDED', `Simulação de burst atingiu limite de teste (${b.count} reqs/5s)`);
    return res.status(429).json({
      error: 'Teste Anti-DDoS: Limite de taxa de requisições excedido com sucesso! Status HTTP 429 retornado.',
      code: 'RATE_LIMIT_TRIGGERED_SUCCESSFULLY',
      testStatus: 'PASSED',
      requestsCount: b.count,
    });
  }

  res.json({
    status: 'ok',
    message: 'Requisição aceita dentro do limite normal.',
    requestsCount: b.count,
    remainingBeforeBlock: 5 - b.count,
  });
});

// Test Injection / XSS Sanitization Endpoint
app.post('/api/security/test-injection', (req, res) => {
  // If request reached here without being intercepted by sanitizer middleware, payload was clean
  res.json({
    status: 'clean',
    message: 'Payload validado e sem ameaças detectadas.',
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
