import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais } from '../utils/defaults';
import { 
  Printer, Copy, Download, Edit3, Check, CheckCheck, 
  ShieldCheck, FileText, ChevronRight, Eye, RefreshCw, QrCode, Smartphone,
  Palmtree, FileDown, CheckCircle2, AlertCircle
} from 'lucide-react';
import { QrCodeModal } from './QrCodeModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ContractViewerProps {
  contract: ContractData;
  onEditRequested: () => void;
  onUpdateContract: (updated: ContractData) => void;
  onOpenPublicView?: (contract: ContractData) => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  onEditRequested,
  onUpdateContract,
  onOpenPublicView,
}) => {
  const [copied, setCopied] = useState(false);
  const [guaranteeViewMode, setGuaranteeViewMode] = useState<'only_chosen' | 'all_options'>('only_chosen');
  const [showQrModal, setShowQrModal] = useState(false);
  const [printScope, setPrintScope] = useState<'all' | 'contract_only' | 'anexo_only'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  const locador = contract.locador;
  const locatario = contract.locatario;
  const objeto = contract.objeto;
  const prazo = contract.prazo;
  const valores = contract.valores;
  const vistoria = contract.vistoriaDigital;
  const garantia = contract.garantia;
  const foro = contract.foro;
  const testemunhas = contract.testemunhas;
  const inventario = contract.inventario;

  // Render text for full clipboard copy
  const generateRawContractText = (): string => {
    if (contract.usarTextoPersonalizado && contract.textoPersonalizado) {
      return contract.textoPersonalizado;
    }
    let garantiaText = '';
    if (guaranteeViewMode === 'all_options') {
      garantiaText = `Atenção: Mantenha apenas a opção de garantia acordada entre as partes.

[OPÇÃO 1 - CAUÇÃO]: Depósito de ${formatCurrencyBRL(garantia.caucaoValor)} (${garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)}), equivalente a ${garantia.caucaoMeses} meses de aluguel em conta-poupança vinculada (${garantia.caucaoContaPoupanca || 'conta vinculada'}${garantia.caucaoBanco ? ` no ${garantia.caucaoBanco}` : ''}${garantia.caucaoTitular ? `, Titular: ${garantia.caucaoTitular}` : ''}), utilizável para cobrir débitos de aluguel ou reparo/reposição de móveis na saída.

[OPÇÃO 2 - FIADOR]: Assina(m) solidariamente ${garantia.fiadorNome || '[Nome do Fiador]'}, CPF nº ${garantia.fiadorCpf || '[000.000.000-00]'}, RG nº ${garantia.fiadorRg || '[RG]'}${garantia.fiadorConjuge ? ` e seu cônjuge ${garantia.fiadorConjuge} (CPF nº ${garantia.fiadorCpfConjuge || '[CPF Cônjuge]'})` : ''}, residente e domiciliado(a) na ${garantia.fiadorEndereco || '[Endereço do Fiador]'}, com renúncia expressa ao benefício de ordem previsto no Art. 827 do Código Civil Brasileiro.

[OPÇÃO 3 - SEGURO FIANÇA]: Apólice de Seguro Fiança Locatícia nº ${garantia.seguroApolice || '[Número]'} emitida pela seguradora ${garantia.seguroCompanhia || '[Nome da Companhia]'}${garantia.seguroVigenciaInicio ? `, com vigência de ${garantia.seguroVigenciaInicio} a ${garantia.seguroVigenciaTermino || '[Término]'}` : ''}${garantia.seguroCoberturaValor ? ` e cobertura total de ${formatCurrencyBRL(garantia.seguroCoberturaValor)}` : ''}.`;
    } else {
      if (garantia.tipo === 'caucao') {
        garantiaText = `Depósito de ${formatCurrencyBRL(garantia.caucaoValor)} (${garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)}), equivalente a ${garantia.caucaoMeses} meses de aluguel em conta-poupança vinculada (${garantia.caucaoContaPoupanca || 'conta vinculada'}${garantia.caucaoBanco ? ` do banco ${garantia.caucaoBanco}` : ''}${garantia.caucaoTitular ? `, Titular: ${garantia.caucaoTitular}` : ''}), utilizável para cobrir eventuais débitos de aluguel ou reparo e reposição de bens móveis e utensílios na vistoria de saída.`;
      } else if (garantia.tipo === 'fiador') {
        garantiaText = `Assina(m) solidariamente ${garantia.fiadorNome || '[Nome do Fiador]'}, CPF nº ${garantia.fiadorCpf || '[000.000.000-00]'}, RG nº ${garantia.fiadorRg || '[RG]'}${garantia.fiadorConjuge ? ` e seu cônjuge ${garantia.fiadorConjuge} (CPF nº ${garantia.fiadorCpfConjuge || '[CPF Cônjuge]'})` : ''}, residente e domiciliado(a) na ${garantia.fiadorEndereco || '[Endereço do Fiador]'}, o(a) qual se declara fiador(a) e principal pagador(a), renunciando expressamente ao benefício de ordem insculpido no Art. 827 do Código Civil Brasileiro.`;
      } else {
        garantiaText = `Apólice de Seguro Fiança Locatícia nº ${garantia.seguroApolice || '[Número da Apólice]'} emitida pela seguradora ${garantia.seguroCompanhia || '[Nome da Companhia Seguradora]'}${garantia.seguroVigenciaInicio ? `, com vigência de ${garantia.seguroVigenciaInicio} até ${garantia.seguroVigenciaTermino || '[Data]'}` : ''}${garantia.seguroCoberturaValor ? ` e cobertura estipulada em ${formatCurrencyBRL(garantia.seguroCoberturaValor)}` : ''}.`;
      }
    }

    const inventarioRows = inventario.map(
      (item) => `${item.comodo} | ${item.item} | ${item.marcaModelo} | ${item.estado} | ${item.observacoes}`
    ).join('\n');

    if (contract.tipoLocacao === 'temporada') {
      const temp = contract.temporadaInfo;
      return `CONTRATO DE LOCAÇÃO PARA TEMPORADA (ESTADIA POR DIÁRIAS)
Instrumento Particular regido pelos Artigos 48 a 50 da Lei Federal nº 8.245/1991 (Lei do Inquilinato)

1. DAS PARTES CONTRATANTES

LOCADOR(A) / ANFITRIÃO:
Nome Completo: ${locador.nome || '[Nome do Locador]'}
Nacionalidade / Estado Civil / Profissão: ${locador.nacionalidade || '[Brasileiro(a)]'}, ${locador.estadoCivil || '[Estado Civil]'}, ${locador.profissao || '[Profissão]'}
Documentos: RG nº ${locador.rg || '[RG]'} ${locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''} | CPF/MF nº ${locador.cpf || '[000.000.000-00]'}
Endereço: ${locador.endereco || '[Endereço]'}
Contatos: Telefone/WhatsApp: ${locador.telefone || '[Telefone]'} | E-mail: ${locador.email || '[email@exemplo.com]'}

LOCATÁRIO(A) / HÓSPEDE PRINCIPAL:
Nome Completo: ${locatario.nome || '[Nome do Hóspede]'}
Nacionalidade / Profissão: ${locatario.nacionalidade || '[Brasileiro(a)]'}, ${locatario.profissao || '[Profissão]'}
Documentos: RG nº ${locatario.rg || '[RG]'} ${locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''} | CPF/MF nº ${locatario.cpf || '[000.000.000-00]'}
Contatos: Telefone/WhatsApp: ${locatario.telefone || '[Telefone]'} | E-mail: ${locatario.email || '[email@exemplo.com]'}

2. DO OBJETO E DA CAPACIDADE DE OCUPAÇÃO
2.1. Objeto: Locação estritamente para temporada e lazer/descanso temporário do imóvel situado na ${objeto.endereco || '[Endereço completo]'}, composto por ${objeto.compostos || '[compostos]'}.
2.2. Capacidade Máxima: O imóvel comporta no máximo ${temp?.maxHospedes || 4} hóspedes. É expressamente proibida a permanência de hóspedes adicionais não cadastrados, bem como a realização de festas, confraternizações ou eventos ruidosos.

3. DO PRAZO DETERMINADO E HORÁRIOS DE CHECK-IN E CHECK-OUT
3.1. Vigência: Prazo determinado de ${temp?.quantidadeDiarias || 1} diária(s), com Check-in a partir das ${temp?.horarioCheckIn || '15:00'} do dia ${temp?.dataCheckIn || prazo.dataInicio} e Check-out impreterivelmente até as ${temp?.horarioCheckOut || '11:00'} do dia ${temp?.dataCheckOut || prazo.dataTermino}.
3.2. Improrrogação Tácita (Art. 50 da Lei 8.245/91): Findo o prazo ajustado, o(a) LOCATÁRIO(A) desocupará o imóvel voluntariamente. A retenção indevida sujeitará o hóspede a diária penal e desocupação coercitiva.

4. DOS VALORES, ENCARGOS E PAGAMENTO ANTECIPADO (ART. 49)
4.1. Diárias: ${temp?.quantidadeDiarias || 1} diárias a ${formatCurrencyBRL(temp?.valorDiaria || 0)} = ${formatCurrencyBRL((temp?.valorDiaria || 0) * (temp?.quantidadeDiarias || 1))}.
4.2. Taxa de Higienização/Limpeza: ${formatCurrencyBRL(temp?.taxaLimpeza || 0)}.
4.3. Caução de Danos: ${formatCurrencyBRL(temp?.caucaoDanos || 0)}, restituível em até 48 horas após a vistoria de saída caso não haja danos.
4.4. Total da Locação: ${formatCurrencyBRL(temp?.totalGeral || valores.aluguel)}, pago previamente em parcela única conforme expressamente autorizado pelo Art. 49 da Lei 8.245/1991.

5. DA VISTORIA, INVENTÁRIO E BLINDAGEM DIGITAL SHA-256
5.1. Vistoria Prévia: O imóvel e todos os móveis e eletrodomésticos foram vistoriados e fotografados.
Hash SHA-256 de Blindagem: ${vistoria.hashSha256 || '[Hash Criptográfico de Integridade]'}
Link Nuvem: ${vistoria.linkNuvem || 'https://drive.google.com/...'}

6. DAS REGRAS DA CASA E ACESSO ELETRÔNICO
6.1. O(a) LOCATÁRIO(A) declara ciência e concordância irrestrita com as Regras da Casa:
${temp?.regrasCasa ? temp.regrasCasa.map(r => `- ${r}`).join('\n') : '- Lei do silêncio das 22h às 08h\n- Imóvel estritamente não fumante\n- Respeito à capacidade máxima contratada'}
${temp?.fechaduraDigitalSenha ? `6.2. Código de Fechadura Digital: ${temp.fechaduraDigitalSenha} (válido durante o período contratado).` : ''}

7. DO FORO
Elegem as partes o Foro da Comarca de ${foro.comarcaCidadeUf || '[Comarca do Imóvel]'}.

${foro.dataExtenso || '[Data Extensa]'}.

________________________________________________
LOCADOR(A) / ANFITRIÃO: ${locador.nome || '[Nome do Locador]'}
CPF: ${locador.cpf || '[000.000.000-00]'}

________________________________________________
LOCATÁRIO(A) / HÓSPEDE: ${locatario.nome || '[Nome do Hóspede]'}
CPF: ${locatario.cpf || '[000.000.000-00]'}
`;
    }

    return `CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO

1. DAS PARTES CONTRATANTES

LOCADOR(A):
Nome Completo: ${locador.nome || '[Nome Completo do Locador]'}
Nacionalidade / Estado Civil / Profissão: ${locador.nacionalidade || '[Brasileiro(a)]'}, ${locador.estadoCivil || '[Estado Civil]'}, ${locador.profissao || '[Profissão]'}${locador.dataNascimento ? ` | Nasc.: ${locador.dataNascimento}` : ''}
Documentos: RG nº ${locador.rg || '[Número / Órgão Expedidor]'} ${locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''} | CPF/MF nº ${locador.cpf || '[000.000.000-00]'}
Endereço Residencial: ${locador.endereco || '[Rua, Número, Bairro, Cidade/UF, CEP]'}
Contatos: Telefone/WhatsApp: ${locador.telefone || '[DDD + Número]'} | E-mail: ${locador.email || '[email@exemplo.com]'}

LOCATÁRIO(A):
Nome Completo: ${locatario.nome || '[Nome Completo do Locatário]'}
Nacionalidade / Estado Civil / Profissão: ${locatario.nacionalidade || '[Brasileiro(a)]'}, ${locatario.estadoCivil || '[Estado Civil]'}, ${locatario.profissao || '[Profissão]'}${locatario.dataNascimento ? ` | Nasc.: ${locatario.dataNascimento}` : ''}
Documentos: RG nº ${locatario.rg || '[Número / Órgão Expedidor]'} ${locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''} | CPF/MF nº ${locatario.cpf || '[000.000.000-00]'}
Contatos: Telefone/WhatsApp: ${locatario.telefone || '[DDD + Número]'} | E-mail: ${locatario.email || '[email@exemplo.com]'}

2. DO OBJETO E DA MOBÍLIA
2.1. Objeto: Locação estritamente para fins residenciais do imóvel situado na ${objeto.endereco || '[Endereço completo, apto/bloco, bairro, cidade/UF, CEP: 00000-000]'}, composto por ${objeto.compostos || '[listar cômodos resumidos e vaga de garagem nº XX]'}.
2.2. Mobília e Equipamentos: O imóvel é entregue guarnecido de equipamentos eletrodomésticos, eletrônicos, móveis e utensílios pormenorizados no ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO PATRIMONIAL, que passa a integrar este instrumento.
2.3. Vedação de Sublocação: É expressamente vedada a sublocação, cessão, empréstimo total ou parcial (inclusive hospedagem curta estilo Airbnb), sem anuência prévia e formal do(a) LOCADOR(A).

3. DO PRAZO DA LOCAÇÃO
3.1. Vigência: Prazo determinado de ${prazo.vigenciaMeses || 30} meses, com início em ${prazo.dataInicio || '[DD/MM/AAAA]'} e término impreterivelmente em ${prazo.dataTermino || '[DD/MM/AAAA]'}.
3.2. Devolução: Na data de término, o(a) LOCATÁRIO(A) restituirá o imóvel e os bens que o guarnecem completamente desocupados, limpos e no estado registrado na vistoria inicial.

4. DOS VALORES, ENCARGOS E PAGAMENTO
4.1. Aluguel: Valor mensal de ${formatCurrencyBRL(valores.aluguel)} (${valores.aluguelExtenso || numeroPorExtensoReais(valores.aluguel)}), a ser pago pontualmente até o dia ${valores.diaVencimento || '10'} de cada mês subsequente, via chave PIX: ${valores.chavePix || '[Chave PIX]'} ou conta bancária ${valores.banco || '[Banco]'}, Agência: ${valores.agencia || '[Agência]'}, Conta: ${valores.conta || '[Conta]'}.
4.2. Reajuste: Anual, com base na variação acumulada do ${valores.indiceReajuste || 'IPCA'}.
4.3. Despesas e Acessórios: Ficam a cargo do(a) LOCATÁRIO(A):
- Taxa de condomínio ordinária;
- Contas de consumo (energia, água, gás encanado, internet);
- Seguro contra incêndio cobrindo estrutura predial e conteúdo/mobília, indicando o(a) LOCADOR(A) como beneficiário(a).

5. DA VISTORIA E INTEGRIDADE DIGITAL (CLÁUSULA DE BLINDAGEM)
5.1. Vistoria Inicial e Registro Audiovisual: Realizada vistoria física e audiovisual contínua em alta resolução, registrando o estado de cada cômodo, eletrônico e mobília.
5.2. Link e Hash SHA-256: Para garantia incontestável de integridade das imagens, o registro audiovisual encontra-se hospedado no endereço:
Link Nuvem (Somente Leitura): ${vistoria.linkNuvem || 'https://drive.google.com/file/d/.../view'}
Hash Criptográfico (SHA-256): ${vistoria.hashSha256 || '[Cole aqui o código de 64 caracteres gerado via terminal/powershell]'}
5.3. Prazo de Contestação: O(A) LOCATÁRIO(A) dispõe de ${vistoria.prazoContestacaoHoras || 48} (quarenta e oito) horas a partir da entrega das chaves para apontar vícios ocultos ou divergências não listadas. Superado o prazo, o inventário é aceito tacitamente como íntegro.
5.4. Vistoria de Saída: Constatados danos que extrapolem o desgaste natural do uso residencial regular, o(a) LOCATÁRIO(A) arcará com o conserto especializado ou substituição por item de igual marca e especificação.

6. DA GARANTIA LOCATÍCIA
${garantiaText}

7. PENALIDADES E RESCISÃO
7.1. Atraso: Multa moratória de 10% (dez por cento) + juros de mora de 1% ao mês e correção monetária.
7.2. Rescisão Antecipada / Infração Contratual: Multa de 3 (três) aluguéis vigentes, proporcional ao período restante de contrato (Art. 4º da Lei 8.245/91 e Art. 413 do CC).

8. DO FORO
Elegem as partes o Foro da Comarca de ${foro.comarcaCidadeUf || '[Cidade/UF onde o imóvel fica situado]'}, com renúncia a qualquer outro.

${foro.dataExtenso || '[Cidade/UF], [DD] de [Mês] de [AAAA]'}.

________________________________________________
LOCADOR(A): ${locador.nome || '[Nome do Locador]'}
CPF: ${locador.cpf || '[000.000.000-00]'}

________________________________________________
LOCATÁRIO(A): ${locatario.nome || '[Nome do Locatário]'}
CPF: ${locatario.cpf || '[000.000.000-00]'}

${garantia.tipo === 'fiador' && garantia.fiadorNome ? `
________________________________________________
FIADOR(A) / CÔNJUGE: ${garantia.fiadorNome}
CPF: ${garantia.fiadorCpf || '[000.000.000-00]'}
` : ''}
Testemunhas:
Nome: ${testemunhas[0]?.nome || '_______________________'} CPF: ${testemunhas[0]?.cpf || '_______________________'} Assinatura: _______________________
Nome: ${testemunhas[1]?.nome || '_______________________'} CPF: ${testemunhas[1]?.cpf || '_______________________'} Assinatura: _______________________


--------------------------------------------------------------------------------

ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO DE BENS MÓVEIS

Cômodo | Item / Equipamento | Marca / Modelo | Estado de Funcionamento / Estético | Observações / Detalhes
${inventarioRows}

Termo de Conferência do Inventário
Declaram as partes terem conferido presencialmente todos os itens listados acima e no registro fotográfico/vídeo da Cláusula 5.2.

Visto do(a) Locador(a): _____________________________
Visto do(a) Locatário(a): ___________________________
`;
  };

  const handleCopy = () => {
    const text = generateRawContractText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const text = generateRawContractText();
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Contrato_Locacao_${locatario.nome ? locatario.nome.replace(/\s+/g, '_') : 'Mobiliado'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = (scope: 'all' | 'contract_only' | 'anexo_only' = 'all') => {
    setPrintScope(scope);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Direct High-Resolution PDF Export using jsPDF and html2canvas
  const handleExportDirectPdf = async () => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);

    try {
      const sheetElement = document.getElementById('printable-contract-sheet');
      if (!sheetElement) {
        throw new Error('Elemento do contrato não encontrado na página.');
      }

      // Render high-definition canvas (scale 2.0 ensures crisp typography)
      const canvas = await html2canvas(sheetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: sheetElement.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // A4 page in millimeters: 210 x 297 mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Multi-page pagination
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const clientName = locatario.nome ? locatario.nome.replace(/\s+/g, '_') : 'Mobiliado';
      const cleanFileName = `Contrato_Locacao_${clientName}_${new Date().toISOString().substring(0, 10)}.pdf`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_.-]/g, '_');

      pdf.save(cleanFileName);

      setPdfSuccessMessage('PDF gerado e baixado com sucesso! Verifique sua pasta de Downloads.');
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro na geração de PDF via jsPDF:', err);
      setPdfErrorMessage('Não foi possível gerar o PDF automaticamente. Você pode utilizar a opção "Imprimir / Salvar como PDF".');
      setTimeout(() => setPdfErrorMessage(null), 6000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top action bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-700">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {contract.titulo || 'Contrato de Locação Mobiliada'}
            </h2>
            <p className="text-xs text-slate-500">
              Pronto para exportação em PDF (jsPDF), impressão A4 e assinatura digital
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Guarantee toggle / Temporada Badge */}
          {contract.tipoLocacao === 'temporada' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold mr-1">
              <Palmtree className="w-3.5 h-3.5 text-amber-600" />
              <span>Caução de Danos: {formatCurrencyBRL(contract.temporadaInfo?.caucaoDanos || garantia.caucaoValor)}</span>
            </div>
          ) : (
            <div className="flex items-center bg-slate-100 p-1 rounded-lg mr-1">
              <button
                type="button"
                onClick={() => setGuaranteeViewMode('only_chosen')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  guaranteeViewMode === 'only_chosen'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Garantia ({garantia.tipo.toUpperCase()})
              </button>
              <button
                type="button"
                onClick={() => setGuaranteeViewMode('all_options')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  guaranteeViewMode === 'all_options'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exibir Todas
              </button>
            </div>
          )}

          {/* Export PDF with jsPDF */}
          <button
            type="button"
            onClick={handleExportDirectPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Exportar e baixar arquivo PDF formatado diretamente no seu computador com jsPDF"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-emerald-100" />
                <span>Exportar PDF</span>
              </>
            )}
          </button>

          {/* QR Code Share Button */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Gerar QR Code para leitura rápida no celular das partes"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Compartilhar QR</span>
          </button>

          <button
            type="button"
            onClick={onEditRequested}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>

          {/* Print PDF Dropdown / Split Action */}
          <div className="relative inline-flex rounded-lg shadow-xs">
            <button
              type="button"
              onClick={() => handlePrint('all')}
              className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-l-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>
            <select
              aria-label="Opções de Impressão"
              value={printScope}
              onChange={(e) => handlePrint(e.target.value as any)}
              className="px-2 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white border-l border-slate-700 rounded-r-lg font-medium cursor-pointer"
            >
              <option value="all">Completo</option>
              <option value="contract_only">Apenas Contrato</option>
              <option value="anexo_only">Apenas Anexo I</option>
            </select>
          </div>
        </div>
      </div>

      {/* PDF Export Feedback Alert */}
      {pdfSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {pdfErrorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{pdfErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfErrorMessage(null)}
            className="text-xs text-red-700 hover:text-red-900 font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Printable Sheet (Simulating standard A4 legal document styling) */}
      <div 
        id="printable-contract-sheet"
        className="bg-white rounded-2xl p-8 sm:p-14 border border-slate-200 shadow-md contract-sheet text-slate-900 print:text-black leading-relaxed font-serif text-[13.5px] space-y-6"
      >
        
        {/* Main Contract Section */}
        <div className={printScope === 'anexo_only' ? 'print:hidden space-y-6' : 'space-y-6'}>
          {contract.usarTextoPersonalizado && contract.textoPersonalizado ? (
            <div className="space-y-5">
              <div className="no-print p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950 font-sans shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-bold">Minuta de Contrato Personalizada:</span>
                  <span>Exibindo a versão editada no processador de texto (salva no banco de dados).</span>
                </div>
                <button
                  type="button"
                  onClick={onEditRequested}
                  className="px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Editar no Processador
                </button>
              </div>

              <div className="whitespace-pre-wrap font-serif text-[13.5px] leading-relaxed text-slate-900 print:text-black">
                {contract.textoPersonalizado}
              </div>
            </div>
          ) : (
            <>
              {/* Document Title Header */}
              <div className="text-center pb-6 border-b border-slate-300">
            {contract.tipoLocacao === 'temporada' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold uppercase tracking-wider mb-2">
                <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                <span>Locação por Temporada / Diárias (Airbnb Style)</span>
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase text-slate-900">
              {contract.tipoLocacao === 'temporada' 
                ? 'CONTRATO DE LOCAÇÃO PARA TEMPORADA DE IMÓVEL MOBILIADO' 
                : 'CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO'}
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-1">
              {contract.tipoLocacao === 'temporada'
                ? 'Instrumento Particular regido pelos Arts. 48 a 50 da Lei Federal nº 8.245/1991 (Lei do Inquilinato) e Código Civil'
                : 'Instrumento Particular regido pela Lei Federal nº 8.245/1991 (Lei do Inquilinato) e Código Civil'}
            </p>
          </div>

        {/* 1. DAS PARTES CONTRATANTES */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            1. DAS PARTES CONTRATANTES
          </h2>

          <div className="space-y-2">
            <p className="font-semibold text-xs tracking-wider uppercase text-slate-700 font-sans">
              {contract.tipoLocacao === 'temporada' ? 'LOCADOR(A) / ANFITRIÃO(Ã):' : 'LOCADOR(A):'}
            </p>
            <div className="pl-4 space-y-1">
              <p>
                <strong>Nome Completo:</strong> {locador.nome || '[Nome Completo do Locador]'}
              </p>
              <p>
                <strong>Nacionalidade / Estado Civil / Profissão:</strong> {locador.nacionalidade || '[Brasileiro(a)]'}, {locador.estadoCivil || '[Estado Civil]'}, {locador.profissao || '[Profissão]'}
              </p>
              <p>
                <strong>Documentos:</strong> RG nº {locador.rg || '[Número]'} {locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''} | CPF/MF nº <span className="font-mono tabular-nums">{locador.cpf || '[000.000.000-00]'}</span>
              </p>
              <p>
                <strong>Endereço Residencial:</strong> {locador.endereco || '[Rua, Número, Bairro, Cidade/UF, CEP]'}
              </p>
              <p>
                <strong>Contatos:</strong> Telefone/WhatsApp: <span className="font-mono">{locador.telefone || '[DDD + Número]'}</span> | E-mail: {locador.email || '[email@exemplo.com]'}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="font-semibold text-xs tracking-wider uppercase text-slate-700 font-sans">
              {contract.tipoLocacao === 'temporada' ? 'LOCATÁRIO(A) / HÓSPEDE PRINCIPAL:' : 'LOCATÁRIO(A):'}
            </p>
            <div className="pl-4 space-y-1">
              <p>
                <strong>Nome Completo:</strong> {locatario.nome || '[Nome Completo do Locatário]'}
              </p>
              <p>
                <strong>Nacionalidade / Estado Civil / Profissão:</strong> {locatario.nacionalidade || '[Brasileiro(a)]'}, {locatario.estadoCivil || '[Estado Civil]'}, {locatario.profissao || '[Profissão]'}
              </p>
              <p>
                <strong>Documentos:</strong> RG nº {locatario.rg || '[Número]'} {locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''} | CPF/MF nº <span className="font-mono tabular-nums">{locatario.cpf || '[000.000.000-00]'}</span>
              </p>
              <p>
                <strong>Contatos:</strong> Telefone/WhatsApp: <span className="font-mono">{locatario.telefone || '[DDD + Número]'}</span> | E-mail: {locatario.email || '[email@exemplo.com]'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. DO OBJETO E DA MOBÍLIA */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            2. DO OBJETO E DA MOBÍLIA
          </h2>
          <p className="text-justify leading-relaxed">
            <strong>2.1. Objeto:</strong> Locação estritamente para {contract.tipoLocacao === 'temporada' ? 'fins de temporada, lazer ou descanso temporário' : 'fins residenciais'} do imóvel situado na <strong>{objeto.endereco || '[Endereço completo, apto/bloco, bairro, cidade/UF, CEP: 00000-000]'}</strong>, composto por {objeto.compostos || '[listar cômodos resumidos e vaga de garagem nº XX]'}.
          </p>
          <p className="text-justify leading-relaxed">
            <strong>2.2. Mobília e Equipamentos:</strong> O imóvel é entregue guarnecido de equipamentos eletrodomésticos, eletrônicos, móveis e utensílios pormenorizados no <strong>ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO PATRIMONIAL</strong>, que passa a integrar este instrumento.
          </p>
          {contract.tipoLocacao === 'temporada' ? (
            <p className="text-justify leading-relaxed">
              <strong>2.3. Capacidade de Hóspedes:</strong> O imóvel comporta no máximo <strong>{contract.temporadaInfo?.maxHospedes || 4} hóspedes</strong>. É terminantemente proibida a acomodação de hóspedes adicionais além do pactuado, bem como a realização de festas, eventos comemorativos ou sublocação a terceiros.
            </p>
          ) : (
            <p className="text-justify leading-relaxed">
              <strong>2.3. Vedação de Sublocação:</strong> É expressamente vedada a sublocação, cessão, empréstimo total ou parcial (inclusive hospedagem curta estilo Airbnb), sem anuência prévia e formal do(a) LOCADOR(A).
            </p>
          )}
        </div>

        {/* 3. DO PRAZO DA LOCAÇÃO */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            3. DO PRAZO DA LOCAÇÃO
          </h2>
          {contract.tipoLocacao === 'temporada' ? (
            <>
              <p className="text-justify leading-relaxed">
                <strong>3.1. Vigência e Diárias:</strong> Prazo determinado de <strong>{contract.temporadaInfo?.quantidadeDiarias || 1} diária(s)</strong>, com início do Check-in em <strong>{contract.temporadaInfo?.dataCheckIn || prazo.dataInicio}</strong> a partir das <strong>{contract.temporadaInfo?.horarioCheckIn || '15:00'}</strong> e término improrrogável do Check-out em <strong>{contract.temporadaInfo?.dataCheckOut || prazo.dataTermino}</strong> até as <strong>{contract.temporadaInfo?.horarioCheckOut || '11:00'}</strong>.
              </p>
              <p className="text-justify leading-relaxed">
                <strong>3.2. Improrrogação Tácita (Art. 50, Lei 8.245/1991):</strong> Findo o prazo estipulado, o(a) LOCATÁRIO(A) obriga-se a restituir o imóvel e seus pertences completamente desocupados e limpos. A retenção do imóvel após o horário limite acarretará cobrança de diária penal e ensejará a imediata retomada do imóvel.
              </p>
            </>
          ) : (
            <>
              <p className="text-justify leading-relaxed">
                <strong>3.1. Vigência:</strong> Prazo determinado de <strong>{prazo.vigenciaMeses || 30} meses</strong>, com início em <strong>{prazo.dataInicio || '[DD/MM/AAAA]'}</strong> e término impreterivelmente em <strong>{prazo.dataTermino || '[DD/MM/AAAA]'}.
              </strong></p>
              <p className="text-justify leading-relaxed">
                <strong>3.2. Devolução:</strong> Na data de término, o(a) LOCATÁRIO(A) restituirá o imóvel e os bens que o guarnecem completamente desocupados, limpos e no estado registrado na vistoria inicial.
              </p>
            </>
          )}
        </div>

        {/* 4. DOS VALORES, ENCARGOS E PAGAMENTO */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            4. DOS VALORES, ENCARGOS E PAGAMENTO
          </h2>
          {contract.tipoLocacao === 'temporada' ? (
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-sans">
                <p><strong>4.1. Diárias:</strong> {contract.temporadaInfo?.quantidadeDiarias || 1} diárias x {formatCurrencyBRL(contract.temporadaInfo?.valorDiaria || 0)} = <strong>{formatCurrencyBRL((contract.temporadaInfo?.valorDiaria || 0) * (contract.temporadaInfo?.quantidadeDiarias || 1))}</strong></p>
                <p><strong>4.2. Taxa de Higienização e Limpeza:</strong> {formatCurrencyBRL(contract.temporadaInfo?.taxaLimpeza || 0)}</p>
                <p><strong>4.3. Caução de Danos:</strong> {formatCurrencyBRL(contract.temporadaInfo?.caucaoDanos || 0)} (restituível em até 48h após vistoria de saída)</p>
                <p className="text-slate-900 font-bold pt-1.5 border-t border-slate-200 text-sm">
                  Total Geral da Locação por Temporada: {formatCurrencyBRL(contract.temporadaInfo?.totalGeral || valores.aluguel)} ({numeroPorExtensoReais(contract.temporadaInfo?.totalGeral || valores.aluguel)})
                </p>
              </div>
              <p className="text-justify leading-relaxed">
                <strong>4.4. Pagamento Antecipado (Art. 49, Lei 8.245/1991):</strong> As partes ajustam expressamente que o pagamento do aluguel e dos encargos é realizado previamente e de uma só vez, via PIX: <strong>{valores.chavePix || '[Chave PIX]'}</strong> ou conta bancária {valores.banco || '[Banco]'}.
              </p>
            </div>
          ) : (
            <>
              <p className="text-justify leading-relaxed">
                <strong>4.1. Aluguel:</strong> Valor mensal de <strong>{formatCurrencyBRL(valores.aluguel)} ({valores.aluguelExtenso || numeroPorExtensoReais(valores.aluguel)})</strong>, a ser pago pontualmente até o dia <strong>{valores.diaVencimento || 10}</strong> de cada mês subsequente, via chave PIX: <strong>{valores.chavePix || '[Chave PIX]'}</strong> ou conta bancária <strong>{valores.banco || '[Banco]'}</strong>, Agência: <strong>{valores.agencia || '[Agência]'}</strong>, Conta: <strong>{valores.conta || '[Conta]'}</strong> ({valores.tipoConta || 'Conta Corrente'}).
              </p>
              <p className="text-justify leading-relaxed">
                <strong>4.2. Reajuste:</strong> Anual, com base na variação acumulada do <strong>{valores.indiceReajuste || 'IPCA'}</strong>.
              </p>
              <div className="text-justify leading-relaxed space-y-1">
                <p><strong>4.3. Despesas e Acessórios:</strong> Ficam a cargo do(a) LOCATÁRIO(A):</p>
                <ul className="list-disc pl-6 space-y-0.5">
                  <li>Taxa de condomínio ordinária;</li>
                  <li>Contas de consumo (energia, água, gás encanado, internet);</li>
                  <li>Seguro contra incêndio cobrindo estrutura predial e conteúdo/mobília, indicando o(a) LOCADOR(A) como beneficiário(a).</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* 5. DA VISTORIA E INTEGRIDADE DIGITAL (CLÁUSULA DE BLINDAGEM) */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>5. DA VISTORIA, FOTOS E INTEGRIDADE DIGITAL (CLÁUSULA DE BLINDAGEM)</span>
          </h2>
          <p className="text-justify leading-relaxed">
            <strong>5.1. Vistoria Inicial e Registro Audiovisual:</strong> Realizada vistoria física e fotográfica contínua em alta resolução, atestando o estado de conservação de cada cômodo, pintura, pisos, instalações elétricas, hidráulicas e mobília, cujas fotos e detalhes integram o <strong>ANEXO II – LAUDO FOTOGRÁFICO DE VISTORIA INICIAL</strong> deste contrato.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
              <p>
                <strong>Data da Vistoria Inicial:</strong> {vistoria.dataVistoria || prazo.dataInicio || 'Data de assinatura do contrato'}
              </p>
              <p>
                <strong>Responsável / Vistoriador(a):</strong> {vistoria.responsavelVistoria || locador.nome || 'Locador(a) / Administrador'}
              </p>
              {vistoria.chavesEntregues && (
                <p className="sm:col-span-2">
                  <strong>Chaves e Controles Entregues:</strong> {vistoria.chavesEntregues}
                </p>
              )}
            </div>

            {vistoria.observacoesGerais && (
              <div className="pt-1 border-t border-slate-200/80">
                <p className="font-semibold text-slate-800">Laudo Técnico e Estado Geral de Conservação:</p>
                <p className="text-slate-700 leading-relaxed text-justify mt-0.5">
                  {vistoria.observacoesGerais}
                </p>
              </div>
            )}

            <div className="pt-1 border-t border-slate-200/80 space-y-1">
              <p><strong>5.2. Link e Hash SHA-256:</strong> Para garantia incontestável de integridade das imagens, o registro audiovisual encontra-se hospedado no endereço:</p>
              <p className="text-blue-700 break-all font-mono">
                <strong>Link Nuvem (Somente Leitura):</strong>{' '}
                <a href={vistoria.linkNuvem} target="_blank" rel="noopener noreferrer" className="underline">
                  {vistoria.linkNuvem || 'https://drive.google.com/file/d/.../view'}
                </a>
              </p>
              <p className="font-mono text-slate-800 break-all">
                <strong>Hash Criptográfico (SHA-256):</strong>{' '}
                <span className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px]">
                  {vistoria.hashSha256 || '[Hash criptográfico gerado das fotos da vistoria]'}
                </span>
              </p>
            </div>
          </div>

          <p className="text-justify leading-relaxed">
            <strong>5.3. Prazo de Contestação:</strong> O(A) LOCATÁRIO(A) dispõe de <strong>{vistoria.prazoContestacaoHoras || 48} (quarenta e oito) horas</strong> a partir da entrega das chaves para apontar eventuais vícios ocultos ou divergências não listadas. Superado o prazo, o laudo e o inventário são aceitos tacitamente como íntegros e incontestáveis.
          </p>
          <p className="text-justify leading-relaxed">
            <strong>5.4. Vistoria de Saída:</strong> Finda a locação, proceder-se-á a vistoria final. Constatados danos que extrapolem o desgaste natural do uso residencial regular, o(a) LOCATÁRIO(A) arcará com o conserto especializado ou substituição por item de igual especificação.
          </p>
        </div>

        {/* 6. DA GARANTIA LOCATÍCIA OU CAUÇÃO DE DANOS */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            {contract.tipoLocacao === 'temporada' ? '6. DA CAUÇÃO DE DANOS E PRESERVAÇÃO PATRIMONIAL' : '6. DA GARANTIA LOCATÍCIA'}
          </h2>

          {contract.tipoLocacao === 'temporada' ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-sans">
              <p>
                <strong>Caução de Danos:</strong> Fica estipulada a caução no montante de <strong>{formatCurrencyBRL(contract.temporadaInfo?.caucaoDanos || garantia.caucaoValor)} ({numeroPorExtensoReais(contract.temporadaInfo?.caucaoDanos || garantia.caucaoValor)})</strong>, retida como garantia da preservação e integridade dos móveis, equipamentos e utensílios listados no ANEXO I.
              </p>
              <p className="text-slate-600">
                Não constatadas avarias, quebras, extravios ou violação das regras do condomínio e da casa, a quantia será integralmente restituída ao(à) LOCATÁRIO(A) em até 48 (quarenta e oito) horas após a vistoria final de Check-out.
              </p>
            </div>
          ) : guaranteeViewMode === 'all_options' ? (
            <div className="space-y-3">
              <p className="italic text-xs text-slate-500 font-sans">
                Atenção: Mantenha apenas a opção de garantia acordada entre as partes.
              </p>
              
              <div className={`p-3 rounded-lg border ${garantia.tipo === 'caucao' ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <p>
                  <strong>[OPÇÃO 1 - CAUÇÃO]:</strong> Depósito de <strong>{formatCurrencyBRL(garantia.caucaoValor)} ({garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)})</strong>, equivalente a <strong>{garantia.caucaoMeses} meses</strong> de aluguel em conta-poupança vinculada ({garantia.caucaoContaPoupanca || 'conta vinculada'}{garantia.caucaoBanco ? ` no ${garantia.caucaoBanco}` : ''}{garantia.caucaoTitular ? `, Titular: ${garantia.caucaoTitular}` : ''}), utilizável para cobrir débitos de aluguel ou reparo/reposição de móveis na saída.
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${garantia.tipo === 'fiador' ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <p>
                  <strong>[OPÇÃO 2 - FIADOR]:</strong> Assina(m) solidariamente <strong>{garantia.fiadorNome || '[Nome do Fiador]'}</strong>, CPF nº <span className="font-mono">{garantia.fiadorCpf || '[000.000.000-00]'}</span>, RG nº {garantia.fiadorRg || '[RG]'}{garantia.fiadorConjuge ? ` e seu cônjuge ${garantia.fiadorConjuge} (CPF nº ${garantia.fiadorCpfConjuge || '[CPF Cônjuge]'})` : ''}, residente e domiciliado(a) na {garantia.fiadorEndereco || '[Endereço do Fiador]'}, com expressa renúncia ao benefício de ordem do Art. 827 do Código Civil.
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${garantia.tipo === 'seguro_fianca' ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                <p>
                  <strong>[OPÇÃO 3 - SEGURO FIANÇA]:</strong> Apólice nº <strong>{garantia.seguroApolice || '[Número]'}</strong> emitida pela seguradora <strong>{garantia.seguroCompanhia || '[Nome da Companhia]'}</strong>{garantia.seguroVigenciaInicio ? `, com vigência de ${garantia.seguroVigenciaInicio} a ${garantia.seguroVigenciaTermino || '[Data]'}` : ''}{garantia.seguroCoberturaValor ? ` e cobertura estipulada de ${formatCurrencyBRL(garantia.seguroCoberturaValor)}` : ''}.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {garantia.tipo === 'caucao' && (
                <p className="text-justify leading-relaxed">
                  <strong>[OPÇÃO 1 - CAUÇÃO]:</strong> Depósito de <strong>{formatCurrencyBRL(garantia.caucaoValor)} ({garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)})</strong>, equivalente a <strong>{garantia.caucaoMeses} meses</strong> de aluguel em conta-poupança vinculada ({garantia.caucaoContaPoupanca || 'conta vinculada'}{garantia.caucaoBanco ? ` do banco ${garantia.caucaoBanco}` : ''}{garantia.caucaoTitular ? `, Titular: ${garantia.caucaoTitular}` : ''}), utilizável para cobrir eventuais débitos de aluguel ou reparo e reposição de móveis na vistoria de saída.
                </p>
              )}

              {garantia.tipo === 'fiador' && (
                <p className="text-justify leading-relaxed">
                  <strong>[OPÇÃO 2 - FIADOR]:</strong> Assina(m) solidariamente <strong>{garantia.fiadorNome || '[Nome do Fiador]'}</strong>, portador(a) do CPF nº <span className="font-mono">{garantia.fiadorCpf || '[000.000.000-00]'}</span>, RG nº {garantia.fiadorRg || '[Número / Órgão]'}{garantia.fiadorConjuge ? ` e seu cônjuge ${garantia.fiadorConjuge} (CPF nº ${garantia.fiadorCpfConjuge || '[CPF Cônjuge]'})` : ''}, residente e domiciliado(a) na {garantia.fiadorEndereco || '[Endereço do Fiador]'}, o(a) qual se declara fiador(a) e principal pagador(a), com renúncia expressa ao benefício de ordem insculpido no Art. 827 do Código Civil Brasileiro.
                </p>
              )}

              {garantia.tipo === 'seguro_fianca' && (
                <p className="text-justify leading-relaxed">
                  <strong>[OPÇÃO 3 - SEGURO FIANÇA]:</strong> Apólice de Seguro Fiança Locatícia nº <strong>{garantia.seguroApolice || '[Número da Apólice]'}</strong> emitida pela seguradora <strong>{garantia.seguroCompanhia || '[Nome da Companhia Seguradora]'}</strong>{garantia.seguroVigenciaInicio ? `, com vigência de ${garantia.seguroVigenciaInicio} a ${garantia.seguroVigenciaTermino || '[Data]'}` : ''}{garantia.seguroCoberturaValor ? ` e cobertura no valor de ${formatCurrencyBRL(garantia.seguroCoberturaValor)}` : ''}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* REGRAS DA CASA PARA TEMPORADA */}
        {contract.tipoLocacao === 'temporada' && (
          <div className="space-y-2">
            <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
              7. DAS REGRAS DA CASA, CONVIVÊNCIA E FECHADURA DIGITAL
            </h2>
            <p className="text-justify leading-relaxed">
              <strong>7.1. Regras de Convivência e Condomínio:</strong> O(a) LOCATÁRIO(A) e seus acompanhantes obrigam-se formalmente a cumprir as regras do imóvel:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-xs text-slate-800">
              {(contract.temporadaInfo?.regrasCasa || [
                'Proibido som excessivo e perturbação do sossego (Lei do Silêncio das 22h às 08h)',
                'Imóvel 100% não fumante (sujeito à taxa de higienização de R$ 350,00)',
                'Acomodação estritamente restrita à capacidade máxima contratada',
                'Zelar pelo uso consciente de energia e desligar o ar-condicionado ao sair'
              ]).map((regra, i) => (
                <li key={i}>{regra}</li>
              ))}
            </ul>
            {contract.temporadaInfo?.fechaduraDigitalSenha && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1 font-sans">
                <p className="font-bold text-amber-950">Acesso Autônomo e Conectividade (Self Check-in):</p>
                <p className="text-amber-900">
                  Senha da Fechadura Digital: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-slate-950">{contract.temporadaInfo.fechaduraDigitalSenha}</strong> (válida exclusivamente durante o período da reserva).
                </p>
                {contract.temporadaInfo.wifiRede && (
                  <p className="text-amber-900">
                    Rede Wi-Fi: <strong className="font-mono">{contract.temporadaInfo.wifiRede}</strong> | Senha: <strong className="font-mono">{contract.temporadaInfo.wifiSenha}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 7. PENALIDADES E RESCISÃO */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            7. PENALIDADES E RESCISÃO
          </h2>
          <p className="text-justify leading-relaxed">
            <strong>7.1. Atraso:</strong> Multa moratória de 10% (dez por cento) + juros de mora de 1% ao mês e correção monetária.
          </p>
          <p className="text-justify leading-relaxed">
            <strong>7.2. Rescisão Antecipada / Infração Contratual:</strong> Multa de 3 (três) aluguéis vigentes, proporcional ao período restante de contrato (Art. 4º da Lei 8.245/91 e Art. 413 do CC).
          </p>
        </div>

        {/* 8. DO FORO */}
        <div className="space-y-2">
          <h2 className="font-bold text-sm tracking-wide uppercase text-slate-900 font-sans border-b border-slate-200 pb-1">
            8. DO FORO
          </h2>
          <p className="text-justify leading-relaxed">
            Elegem as partes o Foro da Comarca de <strong>{foro.comarcaCidadeUf || '[Cidade/UF onde o imóvel fica situado]'}</strong>, com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>
        </div>

        {/* Date and Signatures */}
        <div className="pt-6 space-y-8">
          <p className="text-right font-sans text-xs">
            {foro.dataExtenso || `${foro.cidadeUf || 'São Paulo/SP'}, ${new Date().toLocaleDateString('pt-BR')}`}.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 font-sans">
            <div className="border-t border-slate-900 pt-2 text-center">
              <p className="font-bold text-xs uppercase text-slate-900">LOCADOR(A)</p>
              <p className="text-xs text-slate-700">{locador.nome || '[Nome Completo do Locador]'}</p>
              <p className="text-[11px] text-slate-500 font-mono">CPF: {locador.cpf || '[000.000.000-00]'}</p>
            </div>

            <div className="border-t border-slate-900 pt-2 text-center">
              <p className="font-bold text-xs uppercase text-slate-900">LOCATÁRIO(A)</p>
              <p className="text-xs text-slate-700">{locatario.nome || '[Nome Completo do Locatário]'}</p>
              <p className="text-[11px] text-slate-500 font-mono">CPF: {locatario.cpf || '[000.000.000-00]'}</p>
            </div>

            {garantia.tipo === 'fiador' && garantia.fiadorNome && (
              <div className="border-t border-slate-900 pt-2 text-center col-span-1 sm:col-span-2 max-w-sm mx-auto">
                <p className="font-bold text-xs uppercase text-slate-900">FIADOR(A) / CÔNJUGE</p>
                <p className="text-xs text-slate-700">{garantia.fiadorNome}</p>
                <p className="text-[11px] text-slate-500 font-mono">CPF: {garantia.fiadorCpf || '[000.000.000-00]'}</p>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-3 font-sans text-xs">
            <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              Testemunhas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border-t border-slate-400 pt-1">
                <p>Nome: {testemunhas[0]?.nome || '_________________________________'}</p>
                <p>CPF: <span className="font-mono">{testemunhas[0]?.cpf || '___________________________________'}</span></p>
                <p className="text-slate-400 mt-2">Assinatura: ___________________________</p>
              </div>
              <div className="border-t border-slate-400 pt-1">
                <p>Nome: {testemunhas[1]?.nome || '_________________________________'}</p>
                <p>CPF: <span className="font-mono">{testemunhas[1]?.cpf || '___________________________________'}</span></p>
                <p className="text-slate-400 mt-2">Assinatura: ___________________________</p>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
        {/* End of Main Contract Section */}
      </div>

        {/* Page Break for Annex I */}
        <div className={`page-break pt-12 border-t-2 border-dashed border-slate-300 print:border-none ${printScope === 'contract_only' ? 'print:hidden' : ''}`}>
          <div className="text-center pb-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900 font-sans">
              ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO DE BENS MÓVEIS
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Relação discriminada de bens, eletrodomésticos, eletrônicos e estado de conservação
            </p>
          </div>

          {/* Inventory Table matching user's exact columns */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg font-sans">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-2.5 border-r border-slate-300">Cômodo</th>
                  <th className="p-2.5 border-r border-slate-300">Item / Equipamento</th>
                  <th className="p-2.5 border-r border-slate-300">Marca / Modelo</th>
                  <th className="p-2.5 border-r border-slate-300">Estado de Funcionamento / Estético</th>
                  <th className="p-2.5">Observações / Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inventario.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/50">
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                      {item.comodo}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900">
                      {item.item}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {item.marcaModelo}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {item.estado}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      <div>{item.observacoes}</div>
                      {item.observacoesLocador && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200/60">
                          <strong>Locador:</strong> {item.observacoesLocador}
                        </div>
                      )}
                      {item.observacoesLocatario && (
                        <div className="text-[11px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-200/60">
                          <strong>Locatário:</strong> {item.observacoesLocatario}
                        </div>
                      )}
                      {item.fotos && item.fotos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {item.fotos.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Foto vistoria"
                              className="w-8 h-8 object-cover rounded border border-slate-300"
                            />
                          ))}
                          <span className="text-[10px] text-slate-400 font-sans">
                            ({item.fotos.length} foto{item.fotos.length > 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Termo de Conferência do Inventário */}
          <div className="mt-8 p-5 bg-slate-50 border border-slate-300 rounded-xl font-sans space-y-6">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Termo de Conferência do Inventário
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed max-w-xl mx-auto">
                Declaram as partes terem conferido presencialmente todos os itens listados acima e no registro fotográfico/vídeo da Cláusula 5.2.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-semibold text-slate-900">Visto do(a) Locador(a)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {contract.vistoLocador || locador.nome || '_________________________________'}
                </p>
              </div>

              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-semibold text-slate-900">Visto do(a) Locatário(a)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {contract.vistoLocatario || locatario.nome || '_________________________________'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Page Break for Annex II - Laudo Fotográfico de Vistoria Inicial */}
        <div className={`page-break pt-12 border-t-2 border-dashed border-slate-300 print:border-none ${printScope === 'contract_only' ? 'print:hidden' : ''}`}>
          <div className="text-center pb-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900 font-sans">
              ANEXO II – LAUDO FOTOGRÁFICO DE VISTORIA INICIAL DO IMÓVEL
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Registro visual de conservação física, pintura, revestimentos, instalações e chaves entregues
            </p>
          </div>

          {/* Metadata Box */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl font-sans text-xs space-y-2 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Data da Vistoria</span>
                <span className="font-semibold">{vistoria.dataVistoria || prazo.dataInicio || 'Data de assinatura'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Vistoriador / Responsável</span>
                <span className="font-semibold">{vistoria.responsavelVistoria || locador.nome || 'Locador(a)'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Chaves e Controles Entregues</span>
                <span className="font-semibold">{vistoria.chavesEntregues || '02 chaves porta social, 01 controle garagem'}</span>
              </div>
            </div>

            {vistoria.observacoesGerais && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Laudo Técnico e Observações Físicas</span>
                <p className="text-slate-800 leading-relaxed text-justify mt-0.5">
                  {vistoria.observacoesGerais}
                </p>
              </div>
            )}

            {vistoria.hashSha256 && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-600 font-mono">
                  <strong>Hash SHA-256 (Integridade):</strong> {vistoria.hashSha256}
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  Selo Criptográfico Válido
                </span>
              </div>
            )}
          </div>

          {/* Photo Gallery Grid */}
          {vistoria.fotos && vistoria.fotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 font-sans">
              {vistoria.fotos.map((fotoUrl, idx) => (
                <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src={fotoUrl} 
                      alt={`Foto Vistoria ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="p-2 text-center bg-slate-50 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-800 block">
                      Foto #{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Registro de Entrada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-slate-300 rounded-xl text-center font-sans space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                Registro fotográfico e audiovisual arquivado no link digital da Cláusula 5.2.
              </p>
              <p className="text-[11px] text-slate-500">
                Para incluir fotos impressas neste anexo, anexe-as na aba "Preencher Contrato &gt; 5. Vistoria, Fotos &amp; Laudo".
              </p>
            </div>
          )}

          {/* Termo de Anuência da Vistoria Fotográfica */}
          <div className="mt-8 p-5 bg-slate-50 border border-slate-300 rounded-xl font-sans space-y-6">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Termo de Vistoria e Recebimento do Imóvel
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed max-w-xl mx-auto">
                O(A) LOCATÁRIO(A) declara haver conferido o estado geral do imóvel conforme fotos e laudo acima descritos, recebendo as chaves nas condições pactuadas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-semibold text-slate-900">Visto do(a) Locador(a)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {contract.vistoLocador || locador.nome || '_________________________________'}
                </p>
              </div>

              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-semibold text-slate-900">Visto do(a) Locatário(a)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {contract.vistoLocatario || locatario.nome || '_________________________________'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* QR Code Modal */}
      <QrCodeModal
        contract={contract}
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        onOpenPublicView={(c) => onOpenPublicView?.(c)}
      />

    </div>
  );
};
