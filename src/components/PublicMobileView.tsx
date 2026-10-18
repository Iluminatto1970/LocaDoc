import React, { useState } from 'react';
import { ContractData } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais } from '../utils/defaults';
import { 
  Building, CheckCircle2, ShieldCheck, Printer, ArrowLeft, 
  FileText, ClipboardList, Lock, Smartphone, ExternalLink 
} from 'lucide-react';

interface PublicMobileViewProps {
  contract: ContractData;
  onBackToApp?: () => void;
}

export const PublicMobileView: React.FC<PublicMobileViewProps> = ({
  contract,
  onBackToApp,
}) => {
  const [activeSegment, setActiveSegment] = useState<'contrato' | 'inventario'>('contrato');

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12 font-sans">
      
      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between no-print">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold truncate">
              {contract.titulo || 'Contrato de Locação Mobiliada'}
            </h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400 inline" />
              <span>Cópia Pública Digital Autenticada</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
            title="Imprimir ou Salvar PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              Voltar ao Painel
            </button>
          )}
        </div>
      </header>

      {/* Segment switcher */}
      <div className="max-w-3xl mx-auto px-4 pt-4 no-print">
        <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSegment('contrato')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSegment === 'contrato'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Contrato Principal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment('inventario')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeSegment === 'inventario'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Laudo Anexo I ({inventario.length} itens)</span>
          </button>
        </div>
      </div>

      {/* Main Reading Card */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-200 text-slate-900 leading-relaxed font-serif text-[13.5px] space-y-6">
          
          {activeSegment === 'contrato' ? (
            <>
              {/* Title */}
              <div className="text-center pb-4 border-b border-slate-200">
                <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider inline-block mb-1">
                  Lei do Inquilinato nº 8.245/91
                </span>
                <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900">
                  CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO
                </h2>
              </div>

              {/* 1. Partes */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  1. DAS PARTES CONTRATANTES
                </h3>
                <div className="text-xs space-y-1">
                  <p><strong>LOCADOR(A):</strong> {locador.nome || '[Locador]'}, {locador.nacionalidade || 'Brasileiro(a)'}, {locador.estadoCivil || 'Casado(a)'}, {locador.profissao || 'Profissão'}.</p>
                  <p><strong>Documentos:</strong> RG nº {locador.rg || '[RG]'} {locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''} | CPF nº <span className="font-mono">{locador.cpf || '[CPF]'}</span></p>
                  <p><strong>Endereço:</strong> {locador.endereco || '[Endereço do Locador]'}</p>
                  <p><strong>Contatos:</strong> {locador.telefone} | {locador.email}</p>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-slate-100">
                  <p><strong>LOCATÁRIO(A):</strong> {locatario.nome || '[Locatário]'}, {locatario.nacionalidade || 'Brasileiro(a)'}, {locatario.estadoCivil || 'Solteiro(a)'}, {locatario.profissao || 'Profissão'}.</p>
                  <p><strong>Documentos:</strong> RG nº {locatario.rg || '[RG]'} {locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''} | CPF nº <span className="font-mono">{locatario.cpf || '[CPF]'}</span></p>
                  <p><strong>Contatos:</strong> {locatario.telefone} | {locatario.email}</p>
                </div>
              </div>

              {/* 2. Objeto */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  2. DO OBJETO E DA MOBÍLIA
                </h3>
                <p className="text-justify">
                  <strong>2.1. Objeto:</strong> Imóvel residencial situado na <strong>{objeto.endereco || '[Endereço]'}</strong>, {objeto.compostos || 'composto por dependências e vaga de garagem'}.
                </p>
                <p className="text-justify">
                  <strong>2.2. Mobília:</strong> O imóvel é entregue guarnecido de equipamentos eletrodomésticos, eletrônicos, móveis e utensílios pormenorizados no <strong>ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO PATRIMONIAL</strong>.
                </p>
                <p className="text-justify">
                  <strong>2.3. Vedação:</strong> É expressamente vedada a sublocação ou cessão (inclusive tipo Airbnb) sem prévia anuência do(a) LOCADOR(A).
                </p>
              </div>

              {/* 3. Prazos */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  3. DO PRAZO DA LOCAÇÃO
                </h3>
                <p className="text-justify">
                  <strong>3.1. Vigência:</strong> Prazo de <strong>{prazo.vigenciaMeses || 30} meses</strong>, iniciando em <strong>{prazo.dataInicio}</strong> e encerrando em <strong>{prazo.dataTermino}</strong>.
                </p>
              </div>

              {/* 4. Valores */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  4. DOS VALORES E PAGAMENTO
                </h3>
                <p className="text-justify">
                  <strong>4.1. Aluguel:</strong> <strong>{formatCurrencyBRL(valores.aluguel)} ({valores.aluguelExtenso || numeroPorExtensoReais(valores.aluguel)})</strong> mensais, vencendo todo dia <strong>{valores.diaVencimento || 10}</strong>, pago via chave PIX <strong>{valores.chavePix || '[Chave PIX]'}</strong> ou depósito no banco {valores.banco} (Ag: {valores.agencia}, CC: {valores.conta}).
                </p>
                <p className="text-justify">
                  <strong>4.2. Reajuste:</strong> Anual pela variação do <strong>{valores.indiceReajuste || 'IPCA'}</strong>.
                </p>
              </div>

              {/* 5. Vistoria & Hash */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  5. DA VISTORIA E INTEGRIDADE DIGITAL (BLINDAGEM)
                </h3>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans space-y-1">
                  <p><strong>Hash Criptográfico SHA-256:</strong></p>
                  <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded border border-slate-200">
                    {vistoria.hashSha256 || 'Hash de 64 caracteres'}
                  </p>
                  {vistoria.linkNuvem && (
                    <p className="pt-1">
                      <a href={vistoria.linkNuvem} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline flex items-center gap-1">
                        <span>Acessar fotos e vídeos da vistoria na nuvem</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* 6. Garantia */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase font-sans tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  6. DA GARANTIA LOCATÍCIA
                </h3>
                {garantia.tipo === 'caucao' && (
                  <p className="text-justify text-xs">
                    <strong>[OPÇÃO 1 - CAUÇÃO]:</strong> Depósito de <strong>{formatCurrencyBRL(garantia.caucaoValor)} ({garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)})</strong>, equivalente a {garantia.caucaoMeses} meses em conta-poupança vinculada ({garantia.caucaoContaPoupanca}{garantia.caucaoBanco ? ` - ${garantia.caucaoBanco}` : ''}).
                  </p>
                )}
                {garantia.tipo === 'fiador' && (
                  <p className="text-justify text-xs">
                    <strong>[OPÇÃO 2 - FIADOR]:</strong> Assina(m) solidariamente <strong>{garantia.fiadorNome}</strong> (CPF: {garantia.fiadorCpf}){garantia.fiadorConjuge ? ` e cônjuge ${garantia.fiadorConjuge}` : ''}, com renúncia expressa ao Art. 827 do CC.
                  </p>
                )}
                {garantia.tipo === 'seguro_fianca' && (
                  <p className="text-justify text-xs">
                    <strong>[OPÇÃO 3 - SEGURO FIANÇA]:</strong> Apólice nº <strong>{garantia.seguroApolice}</strong> emitida pela seguradora <strong>{garantia.seguroCompanhia}</strong>.
                  </p>
                )}
              </div>

              {/* Assinaturas */}
              <div className="pt-4 border-t border-slate-200 text-xs font-sans space-y-4">
                <p className="text-right text-slate-500">{foro.dataExtenso || 'São Paulo/SP'}</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold">LOCADOR(A)</p>
                    <p className="text-[11px] text-slate-600">{locador.nome}</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold">LOCATÁRIO(A)</p>
                    <p className="text-[11px] text-slate-600">{locatario.nome}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Inventário Anexo I */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900 font-sans">
                  ANEXO I – LAUDO DE VISTORIA E INVENTÁRIO DE BENS MÓVEIS
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-1">
                  Relação de móveis, eletrodomésticos e integridade física
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg font-sans">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="p-2 border-r border-slate-200">Cômodo</th>
                      <th className="p-2 border-r border-slate-200">Item / Equipamento</th>
                      <th className="p-2 border-r border-slate-200">Marca / Modelo</th>
                      <th className="p-2 border-r border-slate-200">Estado</th>
                      <th className="p-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {inventario.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-2 font-semibold border-r border-slate-200">{item.comodo}</td>
                        <td className="p-2 font-medium border-r border-slate-200">{item.item}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700">{item.marcaModelo}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700">{item.estado}</td>
                        <td className="p-2 text-slate-600">
                          <div>{item.observacoes}</div>
                          {item.observacoesLocador && (
                            <div className="text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded mt-0.5">
                              <strong>Locador:</strong> {item.observacoesLocador}
                            </div>
                          )}
                          {item.observacoesLocatario && (
                            <div className="text-[10px] text-blue-800 bg-blue-50 px-1 py-0.5 rounded mt-0.5">
                              <strong>Locatário:</strong> {item.observacoesLocatario}
                            </div>
                          )}
                          {item.fotos && item.fotos.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {item.fotos.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt="Foto"
                                  className="w-7 h-7 object-cover rounded border border-slate-200"
                                />
                              ))}
                              <span className="text-[9px] text-slate-400">({item.fotos.length} fotos)</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs space-y-3">
                <p className="text-center font-bold uppercase tracking-wider text-slate-800">
                  Termo de Conferência do Inventário
                </p>
                <p className="text-center text-slate-600 text-[11px]">
                  Declaram as partes terem conferido presencialmente todos os itens listados acima e no registro audiovisual da Cláusula 5.2.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2 text-center">
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-semibold text-slate-800">Visto do(a) Locador(a)</p>
                    <p className="text-[11px] text-slate-500">{contract.vistoLocador || locador.nome}</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-semibold text-slate-800">Visto do(a) Locatário(a)</p>
                    <p className="text-[11px] text-slate-500">{contract.vistoLocatario || locatario.nome}</p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
};
