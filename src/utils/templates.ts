import { ContractData, ContractTemplate } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais } from './defaults';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'tpl-locacao-residencial',
    titulo: 'Locação Residencial Mobiliada com Inventário (Padrão)',
    categoria: 'aluguel_residencial',
    descricao: 'Modelo padrão regulamentado pela Lei nº 8.245/91 para locação residencial, prevendo inventário, caução e vistoria digital com SHA-256.',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    conteudoTexto: `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO
Regido pela Lei Federal nº 8.245/1991 (Lei do Inquilinato)

DAS PARTES CONTRATANTES:

LOCADOR(A): {{LOCADOR_NOME}}, {{LOCADOR_NACIONALIDADE}}, {{LOCADOR_ESTADOCIVIL}}, {{LOCADOR_PROFISSAO}}, portador(a) do RG nº {{LOCADOR_RG}} e inscrito(a) no CPF/MF sob o nº {{LOCADOR_CPF}}, residente em {{LOCADOR_ENDERECO}}, e-mail: {{LOCADOR_EMAIL}}, telefone: {{LOCADOR_TELEFONE}}.

LOCATÁRIO(A): {{LOCATARIO_NOME}}, {{LOCATARIO_NACIONALIDADE}}, {{LOCATARIO_ESTADOCIVIL}}, {{LOCATARIO_PROFISSAO}}, portador(a) do RG nº {{LOCATARIO_RG}} e inscrito(a) no CPF/MF sob o nº {{LOCATARIO_CPF}}, e-mail: {{LOCATARIO_EMAIL}}, telefone: {{LOCATARIO_TELEFONE}}.

As partes acima qualificadas celebram o presente Contrato de Locação Residencial sob as seguintes cláusulas:

CLÁUSULA 1ª - DO OBJETO DA LOCAÇÃO
O presente contrato tem por objeto o imóvel residencial situado em:
{{IMOVEL_ENDERECO}}
Descrição e cômodos: {{IMOVEL_COMPOSTOS}}
Parágrafo Único: O imóvel é entregue guarnecido de mobiliário e utensílios pormenorizados no ANEXO I (Inventário Físico e Laudo Fotográfico com Hash Pericial).

CLÁUSULA 2ª - DO PRAZO CONTRATUAL
A locação terá a vigência estipulada de {{PRAZO_MESES}} meses, iniciando-se em {{DATA_INICIO}} e terminando em {{DATA_TERMINO}}, data em que o(a) LOCATÁRIO(A) restituirá as chaves nas mesmas condições recebidas.

CLÁUSULA 3ª - DO VALOR DO ALUGUEL E ENCARGOS
O aluguel mensal ajustado é de {{VALOR_ALUGUEL}} ({{VALOR_ALUGUEL_EXTENSO}}), vencendo todo dia {{DIA_VENCIMENTO}} de cada mês subsequente ao vencido.
Parágrafo 1º: O valor será reajustado anualmente pela variação acumulada do {{INDICE_REAJUSTE}}.
Parágrafo 2º: O pagamento será efetuado via PIX na chave: {{CHAVE_PIX}} ou na conta bancária indicada pelo Locador.

CLÁUSULA 4ª - DA GARANTIA LOCATÍCIA
Fica ajustada como garantia da presente locação:
{{GARANTIA_DESCRICAO}}

CLÁUSULA 5ª - DA VISTORIA DIGITAL E HASH PERICIAL SHA-256
A integridade da vistoria de entrega das chaves e do acervo fotográfico é resguardada pelo Hash Pericial SHA-256: [{{HASH_SHA256}}], acessível via link: {{LINK_VISTORIA}}. O prazo para contestação é de {{PRAZO_CONTESTACAO}} horas.

CLÁUSULA 6ª - DO FORO
Para dirimir qualquer litígio oriundo deste contrato, as partes elegem o Foro da Comarca de {{CIDADE_FORO}}.

{{CIDADE_FORO}}, {{DATA_EXTENSO}}.

______________________________________
LOCADOR(A): {{LOCADOR_NOME}}

______________________________________
LOCATÁRIO(A): {{LOCATARIO_NOME}}

TESTEMUNHAS:
1. {{TESTEMUNHA_1}}
2. {{TESTEMUNHA_2}}`,
  },
  {
    id: 'tpl-compra-venda',
    titulo: 'Instrumento Particular de Promessa de Compra e Venda de Imóvel',
    categoria: 'venda_imovel',
    descricao: 'Modelo completo para venda de imóveis com sinal/arras, saldo via financiamento/recursos próprios, matrícula no RGI e transmissão de posse.',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    conteudoTexto: `INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL
Regido pelos Artigos 481 e seguintes do Código Civil Brasileiro (Lei nº 10.406/2002)

Pelo presente instrumento particular, de um lado:

PROMITENTE VENDEDOR(A): {{LOCADOR_NOME}}, {{LOCADOR_NACIONALIDADE}}, {{LOCADOR_ESTADOCIVIL}}, {{LOCADOR_PROFISSAO}}, titular do RG nº {{LOCADOR_RG}} e CPF nº {{LOCADOR_CPF}}, domiciliado(a) em {{LOCADOR_ENDERECO}}, e-mail: {{LOCADOR_EMAIL}}, telefone: {{LOCADOR_TELEFONE}}.

E de outro lado:

PROMISSÁRIO(A) COMPRADOR(A): {{LOCATARIO_NOME}}, {{LOCATARIO_NACIONALIDADE}}, {{LOCATARIO_ESTADOCIVIL}}, {{LOCATARIO_PROFISSAO}}, titular do RG nº {{LOCATARIO_RG}} e CPF nº {{LOCATARIO_CPF}}, e-mail: {{LOCATARIO_EMAIL}}, telefone: {{LOCATARIO_TELEFONE}}.

Têm entre si, justo e contratado, o seguinte:

CLÁUSULA 1ª - DO IMÓVEL OBJETO DA TRANSAÇÃO
O(A) PROMITENTE VENDEDOR(A) é legítimo(a) senhor(a) e possuidor(a) do imóvel situado em:
{{IMOVEL_ENDERECO}}
Descrição do imóvel: {{IMOVEL_COMPOSTOS}}
Matrícula Imobiliária nº: {{IMOVEL_MATRICULA}} registrada junto ao {{IMOVEL_CARTORIO}}.
O imóvel é transacionado inteiramente livre e desembaraçado de quaisquer ônus judiciais, hipotecas, penhoras, débitos tributários de IPTU ou dívidas condominiais.

CLÁUSULA 2ª - DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO
O preço total, certo e ajustado para a compra e venda do imóvel é de {{VALOR_VENDA}} ({{VALOR_VENDA_EXTENSO}}), a ser adimplido da seguinte forma:
a) SINAL E PRINCÍPIO DE PAGAMENTO (ARRAS): No valor de {{VALOR_SINAL}}, pago neste ato ou mediante PIX para {{CHAVE_PIX}}, valendo o comprovante como recibo.
b) SALDO REMANESCENTE: No valor de {{SALDO_FINANCIAMENTO}}, pago mediante recursos próprios ou financiamento bancário/carta de consórcio imobiliário.
Condições e prazos convencionados: {{CONDICOES_PAGAMENTO}}.

CLÁUSULA 3ª - DA POSSE E DA ESCRITURAÇÃO DEFINITIVA
A imissão provisória ou definitiva na posse do imóvel ocorrerá após a quitação integral do preço ou liberação dos recursos do financiamento bancário.
Parágrafo Único: O(A) VENDEDOR(A) compromete-se a outorgar a competente Escritura Pública Definitiva de Compra e Venda ou assinar o Contrato de Financiamento Habitacional com força de escritura perante a instituição financeira.

CLÁUSULA 4ª - DA IRRETRATABILIDADE E MULTA RESCISÓRIA
O presente compromisso é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores. Em caso de desistência imotivada por qualquer das partes, incidirá multa não compensatória de 10% (dez por cento) sobre o valor total do negócio, sem prejuízo da retenção de arras na forma do Artigo 418 do Código Civil.

CLÁUSULA 5ª - DAS CERTIDÕES E REGULARIDADE
O(A) PROMITENTE VENDEDOR(A) obriga-se a fornecer todas as certidões negativas de praxe (distribuidores cíveis, criminais, protestos, trabalhistas e fiscais), comprovando sua plena higidez financeira para a conclusão do negócio imobiliário.

CLÁUSULA 6ª - DO FORO
Fica eleito o Foro da Comarca de {{CIDADE_FORO}} para dirimir qualquer dúvida ou litígio decorrente deste contrato.

{{CIDADE_FORO}}, {{DATA_EXTENSO}}.

______________________________________
PROMITENTE VENDEDOR(A): {{LOCADOR_NOME}}

______________________________________
PROMISSÁRIO(A) COMPRADOR(A): {{LOCATARIO_NOME}}

TESTEMUNHAS:
1. {{TESTEMUNHA_1}}
2. {{TESTEMUNHA_2}}`,
  },
  {
    id: 'tpl-locacao-comercial',
    titulo: 'Locação Comercial / Empresarial com Cláusula de Luvas e Adaptação',
    categoria: 'aluguel_comercial',
    descricao: 'Modelo específico para lojas, galpões, salas ou escritórios comerciais, regido pelos Artigos 51 a 57 da Lei nº 8.245/91.',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    conteudoTexto: `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO COMERCIAL / NÃO RESIDENCIAL
Regido pela Lei Federal nº 8.245/1991 (Artigos 51 a 57)

LOCADOR(A): {{LOCADOR_NOME}}, {{LOCADOR_NACIONALIDADE}}, {{LOCADOR_ESTADOCIVIL}}, inscrito(a) no CPF/MF sob o nº {{LOCADOR_CPF}}, com endereço em {{LOCADOR_ENDERECO}}, e-mail: {{LOCADOR_EMAIL}}.

LOCATÁRIO(A): {{LOCATARIO_NOME}}, inscrito(a) no CPF/CNPJ sob o nº {{LOCATARIO_CPF}}, com endereço em {{LOCATARIO_ENDERECO}}, e-mail: {{LOCATARIO_EMAIL}}.

CLÁUSULA 1ª - DO OBJETO E DESTINAÇÃO COMERCIAL
O imóvel situa-se em: {{IMOVEL_ENDERECO}}, sendo destinado exclusivamente ao exercício da atividade empresarial/comercial legalmente autorizada do(a) LOCATÁRIO(A), sendo vedado o uso residencial ou transferência do ponto comercial sem prévia anuência por escrito.

CLÁUSULA 2ª - DO VALOR DO ALUGUEL E FORMA DE PAGAMENTO
O aluguel comercial é de {{VALOR_ALUGUEL}} ({{VALOR_ALUGUEL_EXTENSO}}), vencendo todo dia {{DIA_VENCIMENTO}} do mês. Reajuste anual pelo {{INDICE_REAJUSTE}}.
Pagamento via PIX: {{CHAVE_PIX}}.

CLÁUSULA 3ª - PRAZO DE VIGÊNCIA E RENOVAÇÃO
Vigência de {{PRAZO_MESES}} meses, com início em {{DATA_INICIO}} e término em {{DATA_TERMINO}}.

CLÁUSULA 4ª - DA GARANTIA E OBRIGAÇÕES
{{GARANTIA_DESCRICAO}}

CLÁUSULA 5ª - DO FORO
Foro eleito: Comarca de {{CIDADE_FORO}}.

{{CIDADE_FORO}}, {{DATA_EXTENSO}}.

LOCADOR(A): {{LOCADOR_NOME}}
LOCATÁRIO(A): {{LOCATARIO_NOME}}`,
  },
  {
    id: 'tpl-locacao-temporada',
    titulo: 'Locação por Temporada / Diárias (Airbnb & Short-Term)',
    categoria: 'temporada',
    descricao: 'Modelo para locação de curta temporada (até 90 dias), nos termos dos Artigos 48 a 50 da Lei nº 8.245/91.',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    conteudoTexto: `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA TEMPORADA
Regido pelos Artigos 48 a 50 da Lei Federal nº 8.245/1991

ANFITRIÃO / LOCADOR(A): {{LOCADOR_NOME}}, CPF nº {{LOCADOR_CPF}}, e-mail: {{LOCADOR_EMAIL}}, telefone: {{LOCADOR_TELEFONE}}.
HÓSPEDE / LOCATÁRIO(A): {{LOCATARIO_NOME}}, CPF nº {{LOCATARIO_CPF}}, e-mail: {{LOCATARIO_EMAIL}}, telefone: {{LOCATARIO_TELEFONE}}.

CLÁUSULA 1ª - DO IMÓVEL E PRAZO DE ESTADIA
O imóvel situa-se em: {{IMOVEL_ENDERECO}}.
Período de locação temporária: De {{DATA_INICIO}} a {{DATA_TERMINO}}.
Regras de Check-in e Check-out rigorosamente acordadas entre as partes.

CLÁUSULA 2ª - VALOR TOTAL E PAGAMENTO ANTECIPADO
Valor total da temporada acordado em {{VALOR_ALUGUEL}}, pago antecipadamente através da chave PIX {{CHAVE_PIX}}.

CLÁUSULA 3ª - VISTORIA E HASH CRIPTOGRÁFICO
Unidade entregue vistoriada, com Hash Pericial SHA-256 de integridade: [{{HASH_SHA256}}].

FORO: Comarca de {{CIDADE_FORO}}.
{{CIDADE_FORO}}, {{DATA_EXTENSO}}.

ANFITRIÃO: {{LOCADOR_NOME}}
HÓSPEDE: {{LOCATARIO_NOME}}`,
  },
];

/**
 * Interpola as tags dinâmicas de um modelo com os dados reais de um contrato
 */
export function interpolateTemplate(templateText: string, contract: ContractData): string {
  if (!templateText) return '';

  const { locador, locatario, objeto, prazo, valores, vistoriaDigital, garantia, foro, testemunhas, vendaInfo } = contract;

  // Build garantia text
  let garantiaDescricao = '';
  if (garantia?.tipo === 'caucao') {
    garantiaDescricao = `Depósito-caução no valor de ${formatCurrencyBRL(garantia.caucaoValor || 0)} (${garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor || 0)}), correspondente a ${garantia.caucaoMeses || 3} meses de aluguel, depositado em caderneta de poupança vinculada (${garantia.caucaoContaPoupanca || 'conta vinculada'}${garantia.caucaoBanco ? ` no banco ${garantia.caucaoBanco}` : ''}).`;
  } else if (garantia?.tipo === 'fiador') {
    garantiaDescricao = `Fiança solidária prestada por ${garantia.fiadorNome || '[Nome do Fiador]'}, CPF nº ${garantia.fiadorCpf || '[CPF]'}, RG nº ${garantia.fiadorRg || '[RG]'}${garantia.fiadorConjuge ? ` e cônjuge ${garantia.fiadorConjuge}` : ''}, residente em ${garantia.fiadorEndereco || '[Endereço]'}, com renúncia expressa aos benefícios do Art. 827 do Código Civil.`;
  } else {
    garantiaDescricao = `Apólice de Seguro Fiança Locatícia nº ${garantia?.seguroApolice || '[Apólice]'} emitida pela seguradora ${garantia?.seguroCompanhia || '[Seguradora]'}.`;
  }

  // Calculate sale values if applicable
  const valorVendaNum = vendaInfo?.valorVenda || 0;
  const valorSinalNum = vendaInfo?.sinalEntrada || 0;
  const saldoFinancNum = vendaInfo?.saldoFinanciamento || Math.max(0, valorVendaNum - valorSinalNum);

  const replacements: Record<string, string> = {
    // Locador / Vendedor
    '{{LOCADOR_NOME}}': locador?.nome || 'Iluminatto Moraes',
    '{{LOCADOR_CPF}}': locador?.cpf || '000.000.000-00',
    '{{LOCADOR_RG}}': locador?.rg ? `${locador.rg} ${locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''}` : '00.000.000-0 SSP/SP',
    '{{LOCADOR_NACIONALIDADE}}': locador?.nacionalidade || 'brasileiro(a)',
    '{{LOCADOR_ESTADOCIVIL}}': locador?.estadoCivil || 'casado(a)',
    '{{LOCADOR_PROFISSAO}}': locador?.profissao || 'administrador(a)',
    '{{LOCADOR_ENDERECO}}': locador?.endereco || 'São Paulo/SP',
    '{{LOCADOR_EMAIL}}': locador?.email || 'iluminatto@gmail.com',
    '{{LOCADOR_TELEFONE}}': locador?.telefone || '(11) 99999-0000',

    // Locatário / Comprador
    '{{LOCATARIO_NOME}}': locatario?.nome || '[Nome do Locatário/Comprador]',
    '{{LOCATARIO_CPF}}': locatario?.cpf || '[CPF do Locatário/Comprador]',
    '{{LOCATARIO_RG}}': locatario?.rg ? `${locatario.rg} ${locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''}` : '[RG]',
    '{{LOCATARIO_NACIONALIDADE}}': locatario?.nacionalidade || 'brasileiro(a)',
    '{{LOCATARIO_ESTADOCIVIL}}': locatario?.estadoCivil || 'solteiro(a)',
    '{{LOCATARIO_PROFISSAO}}': locatario?.profissao || '[Profissão]',
    '{{LOCATARIO_ENDERECO}}': locatario?.endereco || '[Endereço do Locatário]',
    '{{LOCATARIO_EMAIL}}': locatario?.email || '[E-mail]',
    '{{LOCATARIO_TELEFONE}}': locatario?.telefone || '[Telefone]',

    // Imóvel
    '{{IMOVEL_ENDERECO}}': objeto?.endereco || '[Endereço completo do Imóvel]',
    '{{IMOVEL_COMPOSTOS}}': objeto?.compostos || '[Descrição dos cômodos e instalações]',
    '{{IMOVEL_MATRICULA}}': vendaInfo?.matriculaImovel || '000.000',
    '{{IMOVEL_CARTORIO}}': vendaInfo?.cartorioRegistro || 'Ofício de Registro de Imóveis Competente',

    // Valores Locação
    '{{VALOR_ALUGUEL}}': formatCurrencyBRL(valores?.aluguel || 0),
    '{{VALOR_ALUGUEL_EXTENSO}}': valores?.aluguelExtenso || numeroPorExtensoReais(valores?.aluguel || 0),
    '{{DIA_VENCIMENTO}}': String(valores?.diaVencimento || 10),
    '{{INDICE_REAJUSTE}}': valores?.indiceReajuste || 'IPCA',
    '{{CHAVE_PIX}}': valores?.chavePix || locador?.email || 'iluminatto@gmail.com',

    // Valores Venda
    '{{VALOR_VENDA}}': formatCurrencyBRL(valorVendaNum),
    '{{VALOR_VENDA_EXTENSO}}': vendaInfo?.valorVendaExtenso || numeroPorExtensoReais(valorVendaNum),
    '{{VALOR_SINAL}}': formatCurrencyBRL(valorSinalNum),
    '{{SALDO_FINANCIAMENTO}}': formatCurrencyBRL(saldoFinancNum),
    '{{CONDICOES_PAGAMENTO}}': vendaInfo?.condicoesPagamento || 'Conforme cronograma de desembolso acordado.',

    // Prazos
    '{{PRAZO_MESES}}': String(prazo?.vigenciaMeses || 30),
    '{{DATA_INICIO}}': prazo?.dataInicio || '[Data Início]',
    '{{DATA_TERMINO}}': prazo?.dataTermino || '[Data Término]',

    // Garantia & Vistoria
    '{{GARANTIA_DESCRICAO}}': garantiaDescricao,
    '{{GARANTIA_TIPO}}': garantia?.tipo?.toUpperCase() || 'CAUÇÃO',
    '{{HASH_SHA256}}': vistoriaDigital?.hashSha256 || 'HASH_INTEGRIDADE_ATIVO',
    '{{LINK_VISTORIA}}': vistoriaDigital?.linkNuvem || '[Link Seguro]',
    '{{PRAZO_CONTESTACAO}}': String(vistoriaDigital?.prazoContestacaoHoras || 48),

    // Foro e Assinaturas
    '{{CIDADE_FORO}}': foro?.comarcaCidadeUf || foro?.cidadeUf || 'São Paulo/SP',
    '{{DATA_EXTENSO}}': foro?.dataExtenso || 'de 2026',
    '{{TESTEMUNHA_1}}': testemunhas?.[0]?.nome ? `${testemunhas[0].nome} (CPF: ${testemunhas[0].cpf || '000.000.000-00'})` : '1. Testemunha: ________________________ (CPF: __________________)',
    '{{TESTEMUNHA_2}}': testemunhas?.[1]?.nome ? `${testemunhas[1].nome} (CPF: ${testemunhas[1].cpf || '000.000.000-00'})` : '2. Testemunha: ________________________ (CPF: __________________)',
  };

  let result = templateText;
  for (const [tag, value] of Object.entries(replacements)) {
    result = result.split(tag).join(value);
  }

  return result;
}

/**
 * Retorna os modelos armazenados com fallback para os templates padrão
 */
export function getSavedTemplates(): ContractTemplate[] {
  try {
    const raw = localStorage.getItem('locadoc_contract_templates');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantir que os templates padrão estão inclusos se não estiverem
        const merged = [...parsed];
        for (const def of DEFAULT_TEMPLATES) {
          if (!merged.some((t) => t.id === def.id)) {
            merged.push(def);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    console.error('Erro ao ler modelos salvos:', e);
  }
  return DEFAULT_TEMPLATES;
}

/**
 * Salva novo modelo no localStorage e sincroniza com o Firestore
 */
export async function saveContractTemplate(template: ContractTemplate): Promise<void> {
  const current = getSavedTemplates();
  const index = current.findIndex((t) => t.id === template.id);
  let updatedList: ContractTemplate[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = template;
  } else {
    updatedList = [template, ...current];
  }
  localStorage.setItem('locadoc_contract_templates', JSON.stringify(updatedList));

  // Sync com Firestore
  try {
    await setDoc(doc(db, 'contract_templates', template.id), {
      ...template,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Erro ao persistir modelo no Firestore (modo offline):', err);
  }
}
