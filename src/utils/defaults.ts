import { ContractData, InventarioItem } from '../types/contract';

export const DEFAULT_INVENTARIO_ITEMS: InventarioItem[] = [
  {
    id: 'inv-1',
    comodo: 'Sala de Estar',
    item: 'Sofá 3 lugares',
    marcaModelo: 'Retrátil Tecido Cinza',
    estado: 'Firme, estofamento higienizado',
    observacoes: 'Sem rasgos ou manchas',
  },
  {
    id: 'inv-2',
    comodo: 'Sala de Estar',
    item: 'Smart TV 50"',
    marcaModelo: 'Samsung Crystal 4K',
    estado: 'Perfeito funcionamento de áudio e tela',
    observacoes: 'Acompanha controle remoto e suporte',
  },
  {
    id: 'inv-3',
    comodo: 'Cozinha',
    item: 'Geladeira Frost Free',
    marcaModelo: 'Brastemp Inverse Inox',
    estado: 'Motor e refrigeração testados 100%',
    observacoes: 'Leve marca estética na lateral direita',
  },
  {
    id: 'inv-4',
    comodo: 'Cozinha',
    item: 'Cooktop / Forno',
    marcaModelo: 'Fischer a Gás',
    estado: 'Todas as bocas e acendimento elétrico ok',
    observacoes: 'Limpo, sem ferrugem',
  },
  {
    id: 'inv-5',
    comodo: 'Dormitório 1',
    item: 'Cama Box Queen + Colchão',
    marcaModelo: 'Molas Ensacadas',
    estado: 'Firme, com capa protetora impermeável',
    observacoes: 'Higienizado, sem deformações',
  },
  {
    id: 'inv-6',
    comodo: 'Dormitório 1',
    item: 'Ar-condicionado Split',
    marcaModelo: 'LG Dual Inverter 12.000 BTUs',
    estado: 'Gelando, filtro limpo, controle original',
    observacoes: 'Testado em modo frio e ventilação',
  },
  {
    id: 'inv-7',
    comodo: 'Banheiro',
    item: 'Chuveiro Elétrico',
    marcaModelo: 'Lorenzetti Duo Shower',
    estado: 'Funcionando nas 4 temperaturas',
    observacoes: 'Resistência testada',
  },
  {
    id: 'inv-8',
    comodo: 'Geral',
    item: 'Pintura das Paredes',
    marcaModelo: 'Branco Neve Fosco Suvinil',
    estado: 'Recém-feita, uniforme',
    observacoes: 'Sem furos ou marcas de fixação',
  },
];

export const getEmptyContract = (): ContractData => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mes = meses[today.getMonth()];
  const ano = today.getFullYear();

  const dataInicioStr = `${day}/${String(today.getMonth() + 1).padStart(2, '0')}/${ano}`;
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 30);
  const dataTerminoStr = `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;

  return {
    id: `contrato-${Date.now()}`,
    titulo: 'Novo Contrato de Locação Mobiliada',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'rascunho',
    locador: {
      nome: '',
      nacionalidade: 'Brasileiro(a)',
      estadoCivil: 'Casado(a)',
      profissao: 'Empresário(a)',
      rg: '',
      orgaoExpedidor: 'SSP/SP',
      cpf: '',
      endereco: '',
      telefone: '',
      email: '',
    },
    locatario: {
      nome: '',
      nacionalidade: 'Brasileiro(a)',
      estadoCivil: 'Solteiro(a)',
      profissao: 'Analista de Sistemas',
      rg: '',
      orgaoExpedidor: 'SSP/SP',
      cpf: '',
      telefone: '',
      email: '',
    },
    objeto: {
      endereco: '',
      compostos: 'composto por 2 dormitórios (sendo 1 suíte), sala de estar/jantar, sacada gourmet, cozinha planejada, área de serviço e 1 vaga de garagem nº 42.',
    },
    prazo: {
      vigenciaMeses: 30,
      dataInicio: dataInicioStr,
      dataTermino: dataTerminoStr,
    },
    valores: {
      aluguel: 3500,
      aluguelExtenso: 'três mil e quinhentos reais',
      diaVencimento: 10,
      chavePix: '',
      banco: 'Banco do Brasil',
      agencia: '1234-5',
      conta: '98765-4',
      tipoConta: 'Conta Corrente',
      indiceReajuste: 'IPCA',
    },
    vistoriaDigital: {
      linkNuvem: 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
      hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      prazoContestacaoHoras: 48,
      dataVistoria: dataInicioStr,
      responsavelVistoria: '',
      chavesEntregues: '02 cópias de chave da porta social, 01 chave da área de serviço e 01 controle de portão da garagem.',
      observacoesGerais: 'Imóvel inspecionado com pintura conservada, esquadrias e vidros íntegros, sem vazamentos aparentes em torneiras ou válvulas.',
      fotos: [],
    },
    garantia: {
      tipo: 'caucao',
      caucaoValor: 10500,
      caucaoValorExtenso: 'dez mil e quinhentos reais',
      caucaoMeses: 3,
      caucaoContaPoupanca: 'Agência 1234, Poupança 013/98765-4',
      fiadorNome: '',
      fiadorConjuge: '',
      fiadorCpf: '',
      fiadorRg: '',
      fiadorEndereco: '',
      fiadorProfissao: '',
      seguroApolice: '99882233',
      seguroCompanhia: 'Porto Seguro Aluguel',
    },
    foro: {
      comarcaCidadeUf: 'São Paulo/SP',
      cidadeUf: 'São Paulo/SP',
      dataExtenso: `São Paulo/SP, ${day} de ${mes} de ${ano}`,
    },
    testemunhas: [
      { nome: '', cpf: '' },
      { nome: '', cpf: '' },
    ],
    inventario: [...DEFAULT_INVENTARIO_ITEMS],
    vistoLocador: '',
    vistoLocatario: '',
  };
};

export const getSampleContract = (): ContractData => {
  const base = getEmptyContract();
  return {
    ...base,
    id: 'contrato-demo-01',
    titulo: 'Apto 142 - Edifício Bellagio Residencial',
    status: 'ativo',
    locador: {
      nome: 'Iluminatto Moraes',
      nacionalidade: 'Brasileiro',
      estadoCivil: 'Casado',
      profissao: 'Empresário / Administrador',
      rg: '28.456.789-0',
      orgaoExpedidor: 'SSP/SP',
      cpf: '123.456.789-00',
      endereco: 'Alameda dos Anapurus, 1200, Moema, São Paulo/SP, CEP: 04087-003',
      telefone: '(11) 98765-4321',
      email: 'iluminatto@gmail.com',
    },
    locatario: {
      nome: 'Mariana Duarte Costa',
      nacionalidade: 'Brasileira',
      estadoCivil: 'Solteira',
      profissao: 'Médica Veterinária',
      rg: '34.890.123-4',
      orgaoExpedidor: 'SSP/SP',
      cpf: '987.654.321-99',
      telefone: '(11) 98123-4567',
      email: 'mariana.costa@exemplo.com.br',
    },
    objeto: {
      endereco: 'Rua Canário, nº 850, Apto 142, Bloco B, Moema, São Paulo/SP, CEP: 04521-004',
      compostos: 'composto por 2 dormitórios (sendo 1 suíte climatizada), sala ampliada para 2 ambientes com varanda gourmet envidraçada, cozinha com armários planejados, área de serviço, banheiro social e 2 vagas de garagem demarcadas nº 51 e 52.',
    },
    prazo: {
      vigenciaMeses: 30,
      dataInicio: '01/11/2026',
      dataTermino: '30/04/2029',
    },
    valores: {
      aluguel: 4800,
      aluguelExtenso: 'quatro mil e oitocentos reais',
      diaVencimento: 10,
      chavePix: 'iluminatto@gmail.com',
      banco: 'Itaú Unibanco',
      agencia: '0345',
      conta: '54321-0',
      tipoConta: 'Conta Corrente',
      indiceReajuste: 'IPCA',
    },
    vistoriaDigital: {
      linkNuvem: 'https://drive.google.com/drive/folders/18XZ7A9b0xQpLk-vistoria-apt142',
      hashSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      prazoContestacaoHoras: 48,
      dataVistoria: '28/10/2026',
      responsavelVistoria: 'Iluminatto Moraes (Locador)',
      chavesEntregues: '02 cópias de chave da porta principal (tetra), 01 chave da área de serviço, 01 controle de portão da garagem e 01 tag eletrônica de acesso à portaria social.',
      observacoesGerais: 'Imóvel entregue com pintura nova Branco Neve Suvinil em perfeito estado, teto sem manchas ou infiltrações. Instalações elétricas 110V/220V testadas e em funcionamento pleno. Torneiras, válvulas de descarga Hydra e registros hidráulicos sem gotejamentos. Vidros íntegros e esquadrias de alumínio lubrificadas.',
      fotos: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      ],
    },
    garantia: {
      tipo: 'caucao',
      caucaoValor: 14400,
      caucaoValorExtenso: 'quatorze mil e quatrocentos reais',
      caucaoMeses: 3,
      caucaoContaPoupanca: 'Banco Itaú, Agência 0345, Poupança 54321-0/500',
      fiadorNome: '',
      fiadorConjuge: '',
      fiadorCpf: '',
      fiadorRg: '',
      fiadorEndereco: '',
      fiadorProfissao: '',
      seguroApolice: '',
      seguroCompanhia: '',
    },
    foro: {
      comarcaCidadeUf: 'São Paulo/SP',
      cidadeUf: 'São Paulo/SP',
      dataExtenso: 'São Paulo/SP, 28 de Outubro de 2026',
    },
    testemunhas: [
      { nome: 'Juliana Mendes Rocha', cpf: '234.567.890-11' },
      { nome: 'Rodrigo Albuquerque Dias', cpf: '345.678.901-22' },
    ],
    inventario: [...DEFAULT_INVENTARIO_ITEMS],
    vistoLocador: 'Iluminatto Moraes',
    vistoLocatario: 'Mariana D. Costa',
  };
};

export async function calculateSHA256(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function formatCurrencyBRL(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Convert numbers up to 1 million into written Portuguese currency words
export function numeroPorExtensoReais(valor: number): string {
  if (!valor || valor <= 0) return 'zero reais';
  
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenasEspeciais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterCentena(n: number): string {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const parts: string[] = [];

    if (c > 0) parts.push(centenas[c]);
    if (d === 1) {
      parts.push(dezenasEspeciais[u]);
    } else {
      if (d > 1) parts.push(dezenas[d]);
      if (u > 0) parts.push(unidades[u]);
    }
    return parts.join(' e ');
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const milhares = Math.floor(inteiro / 1000);
  const resto = inteiro % 1000;

  const resultado: string[] = [];

  if (milhares > 0) {
    if (milhares === 1) {
      resultado.push('um mil');
    } else {
      resultado.push(`${converterCentena(milhares)} mil`);
    }
  }

  if (resto > 0) {
    resultado.push(converterCentena(resto));
  }

  const textoReais = resultado.length > 0 ? `${resultado.join(resto > 0 && resto <= 100 ? ' e ' : ', ')} ${inteiro === 1 ? 'real' : 'reais'}` : '';
  
  if (centavos > 0) {
    const textoCentavos = `${converterCentena(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    return textoReais ? `${textoReais} e ${textoCentavos}` : textoCentavos;
  }

  return textoReais || 'zero reais';
}

export function generateContractFullText(contract: ContractData): string {
  const { locador, locatario, objeto, prazo, valores, vistoriaDigital, garantia, foro } = contract;
  
  let garantiaTexto = '';
  if (garantia.tipo === 'caucao') {
    garantiaTexto = `Depósito-caução no valor de ${formatCurrencyBRL(garantia.caucaoValor)} (${garantia.caucaoValorExtenso || numeroPorExtensoReais(garantia.caucaoValor)}), correspondente a ${garantia.caucaoMeses} meses de aluguel, depositado em caderneta de poupança vinculada (${garantia.caucaoContaPoupanca || 'conta vinculada'}${garantia.caucaoBanco ? ` no banco ${garantia.caucaoBanco}` : ''}${garantia.caucaoTitular ? `, Titular: ${garantia.caucaoTitular}` : ''}), servindo como garantia integral do cumprimento de todas as obrigações locatícias e conservação do mobiliário.`;
  } else if (garantia.tipo === 'fiador') {
    garantiaTexto = `Assunção solidária de fiança por ${garantia.fiadorNome || '[Nome do Fiador]'}, portador(a) do CPF nº ${garantia.fiadorCpf || '[000.000.000-00]'}, RG nº ${garantia.fiadorRg || '[RG]'}${garantia.fiadorConjuge ? ` e seu cônjuge ${garantia.fiadorConjuge} (CPF nº ${garantia.fiadorCpfConjuge || '[CPF Cônjuge]'})` : ''}, residente em ${garantia.fiadorEndereco || '[Endereço]'}, que se declara(m) fiador(es) e principal(is) pagador(es) com renúncia expressa aos benefícios do Art. 827 do Código Civil.`;
  } else {
    garantiaTexto = `Apólice de Seguro Fiança Locatícia nº ${garantia.seguroApolice || '[Apólice]'} contratada junto à seguradora ${garantia.seguroCompanhia || '[Seguradora]'}${garantia.seguroVigenciaInicio ? `, com vigência de ${garantia.seguroVigenciaInicio} a ${garantia.seguroVigenciaTermino || '[Data]'}` : ''}${garantia.seguroCoberturaValor ? ` e cobertura estipulada em ${formatCurrencyBRL(garantia.seguroCoberturaValor)}` : ''}.`;
  }

  if (contract.tipoLocacao === 'temporada') {
    const temp = contract.temporadaInfo;
    return `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA TEMPORADA (POR DIÁRIAS)
Regido pelos Artigos 48 a 50 da Lei Federal nº 8.245/1991 (Lei do Inquilinato)

DAS PARTES CONTRATANTES:
LOCADOR(A) / ANFITRIÃO: ${locador.nome || 'Iluminatto Moraes'}, CPF nº ${locador.cpf || '000.000.000-00'}, e-mail: ${locador.email || 'iluminatto@gmail.com'}, telefone: ${locador.telefone || '(11) 99999-0000'}.
HÓSPEDE / LOCATÁRIO(A): ${locatario.nome || '[Nome do Hóspede]'}, CPF nº ${locatario.cpf || '[CPF]'}, e-mail: ${locatario.email || '[email]'}, telefone: ${locatario.telefone || '[telefone]'}.

CLÁUSULA 1ª - DO IMÓVEL E CAPACIDADE:
O imóvel objeto desta locação por temporada localiza-se em: ${objeto.endereco || '[Endereço do Imóvel]'}. A ocupação máxima é de ${temp?.maxHospedes || 4} pessoas, vedada a permanência de excedentes sem consentimento prévio.

CLÁUSULA 2ª - DO PERÍODO DA ESTADIA:
Entrada (Check-in): a partir das ${temp?.horarioCheckIn || '14:00'} do dia ${temp?.dataCheckIn || prazo.dataInicio}.
Saída (Check-out): impreterivelmente até as ${temp?.horarioCheckOut || '11:00'} do dia ${temp?.dataCheckOut || prazo.dataTermino}. Total de ${temp?.quantidadeDiarias || 1} diária(s).

CLÁUSULA 3ª - DOS VALORES E FORMA DE PAGAMENTO:
Valor da diária: ${formatCurrencyBRL(temp?.valorDiaria || 350)}.
Taxa de limpeza final: ${formatCurrencyBRL(temp?.taxaLimpeza || 150)}.
Caução de segurança contra danos: ${formatCurrencyBRL(temp?.caucaoDanos || 500)}.
Valor total da reserva: ${formatCurrencyBRL(temp?.totalGeral || (valores.aluguel || 500))}, quitado antecipadamente via PIX (${valores.chavePix || 'chave PIX'}).

CLÁUSULA 4ª - DA VISTORIA E HASH PERICIAL SHA-256:
O inventário dos móveis e o estado da unidade contam com registro fotográfico e hash pericial SHA-256: [${vistoriaDigital.hashSha256 || 'HASH_INTEGRIDADE_ATIVO'}], resguardando a integridade das instalações.

CLÁUSULA 5ª - DO FORO:
Fica eleito o Foro da Comarca de ${foro.comarcaCidadeUf || 'São Paulo/SP'} para dirimir qualquer dúvida.

${foro.cidadeUf || 'São Paulo/SP'}, ${foro.dataExtenso || 'de 2026'}.

LOCADOR(A): _______________________________________
HÓSPEDE: _________________________________________`;
  }

  return `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO RESIDENCIAL DE IMÓVEL MOBILIADO
Regido pela Lei Federal nº 8.245/1991 (Lei do Inquilinato)

DAS PARTES CONTRATANTES:

LOCADOR(A): ${locador.nome || 'Iluminatto Moraes'}, ${locador.nacionalidade || 'brasileiro(a)'}, ${locador.estadoCivil || 'casado(a)'}, ${locador.profissao || 'administrador(a)'}, portador(a) do RG nº ${locador.rg || '00.000.000-0'} ${locador.orgaoExpedidor ? `(${locador.orgaoExpedidor})` : ''} e inscrito(a) no CPF/MF sob o nº ${locador.cpf || '000.000.000-00'}, residente e domiciliado(a) na ${locador.endereco || 'São Paulo/SP'}, e-mail: ${locador.email || 'iluminatto@gmail.com'}, telefone: ${locador.telefone || '(11) 99999-0000'}.

LOCATÁRIO(A): ${locatario.nome || '[Nome do Inquilino]'}, ${locatario.nacionalidade || 'brasileiro(a)'}, ${locatario.estadoCivil || 'solteiro(a)'}, ${locatario.profissao || '[Profissão]'}, portador(a) do RG nº ${locatario.rg || '00.000.000-0'} ${locatario.orgaoExpedidor ? `(${locatario.orgaoExpedidor})` : ''} e inscrito(a) no CPF/MF sob o nº ${locatario.cpf || '000.000.000-00'}, e-mail: ${locatario.email || '[email]'}, telefone: ${locatario.telefone || '[telefone]'}.

As partes acima qualificadas têm, entre si, justo e acordado o presente Contrato de Locação Residencial, regido pela Lei Federal nº 8.245/1991 e pelas seguintes cláusulas:

CLÁUSULA 1ª - DO OBJETO DA LOCAÇÃO
O presente contrato tem como objeto a locação exclusivamente residencial do imóvel situado em: ${objeto.endereco || '[Endereço do Imóvel]'}.
Parágrafo Único: O imóvel é entregue totalmente mobiliado, guarnecido de equipamentos e utensílios pormenorizadamente descritos, testados e relacionados no ANEXO I (Laudo de Inventário e Vistoria Digital Integrada).

CLÁUSULA 2ª - DA DESTINAÇÃO E OCUPAÇÃO
O imóvel destina-se estritamente ao uso residencial do(a) LOCATÁRIO(A) e sua família, sendo expressamente vedada a cessão, sublocação total ou parcial, empréstimo, hospedagem de terceiros a título oneroso ou alteração da destinação sem consentimento prévio e expresso do(a) LOCADOR(A).

CLÁUSULA 3ª - DO PRAZO DA LOCAÇÃO
A locação é estipulada pelo prazo certo e determinado de ${prazo.vigenciaMeses || 30} meses, iniciando-se em ${prazo.dataInicio || '[Data Início]'} e terminando de pleno direito em ${prazo.dataTermino || '[Data Término]'}, data em que o(a) LOCATÁRIO(A) se obriga a restituir o imóvel desocupado e em perfeito estado.

CLÁUSULA 4ª - DO VALOR DO ALUGUEL E REAJUSTE
O aluguel mensal ajustado é de ${formatCurrencyBRL(valores.aluguel)} (${valores.aluguelExtenso || numeroPorExtensoReais(valores.aluguel)}), a ser pago pontualmente até o dia ${valores.diaVencimento || 10} de cada mês subsequente ao vencido.
Parágrafo 1º: O valor do aluguel será reajustado anualmente com base na variação acumulada do índice ${valores.indiceReajuste || 'IPCA'} (IBGE) ou outro índice oficial que venha a substituí-lo.
Parágrafo 2º: Além do aluguel, correrão por conta do(a) LOCATÁRIO(A) as despesas ordinárias de condomínio, IPTU, consumo de água, energia elétrica, gás e internet durante a vigência contratual.

CLÁUSULA 5ª - DA FORMA DE PAGAMENTO E QUITAÇÃO
O pagamento será efetuado preferencialmente via transferência bancária instantânea PIX para a chave: ${valores.chavePix || '[Chave PIX]'}, ou na conta corrente bancária: ${valores.banco || 'Banco'}, Agência: ${valores.agencia || '0000'}, Conta: ${valores.conta || '00000-0'}.

CLÁUSULA 6ª - DA VISTORIA DIGITAL E INTEGRIDADE PERICIAL (ANEXO I)
As partes declaram que realizaram a vistoria prévia e minuciosa do imóvel e de todos os bens móveis que o guarnecem, conforme Anexo I.
Parágrafo Único: Para garantia de integridade jurídica irrefutável e proteção contra adulterações, o laudo fotográfico e o acervo probatório estão protegidos pelo Hash Criptográfico Pericial SHA-256: [${vistoriaDigital.hashSha256 || 'HASH_SHA256_PERICIAL_PENDENTE'}], acessível pelo link seguro: ${vistoriaDigital.linkNuvem || '[Link Seguro]'}. O prazo para contestação formal pelo Locatário é de ${vistoriaDigital.prazoContestacaoHoras || 48} horas após a entrega das chaves.

CLÁUSULA 7ª - DA GARANTIA LOCATÍCIA
Para garantia do integral adimplemento de todas as obrigações locatícias, fica convencionada a seguinte modalidade:
${garantiaTexto}

CLÁUSULA 8ª - DA CONSERVAÇÃO E BENFEITORIAS
O(A) LOCATÁRIO(A) obriga-se a manter o imóvel, as instalações hidráulicas, elétricas e os móveis em perfeito estado de asseio e conservação. Quaisquer benfeitorias ou modificações dependerão de autorização prévia por escrito do(a) LOCADOR(A).

CLÁUSULA 9ª - DAS PENALIDADES E MULTAS RESCISÓRIAS
O não pagamento do aluguel e encargos até a data de vencimento implicará na incidência de multa moratória de 10% (dez por cento) sobre o valor total do débito, acrescido de juros de 1% (um por cento) ao mês e correção monetária. A infração a qualquer cláusula deste contrato ensejará multa compensatória equivalente a 3 (três) meses de aluguel, cobrada proporcionalmente ao tempo restante de contrato nos termos do Art. 4º da Lei 8.245/1991.

CLÁUSULA 10ª - DA PROTEÇÃO DE DADOS (LGPD - LEI 13.709/2018)
As partes declaram ciência e conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD). Os dados cadastrais coletados neste instrumento e os documentos de identificação anexados serão utilizados única e exclusivamente para a finalidade legítima de execução deste contrato de locação e cumprimento de obrigação legal.

CLÁUSULA 11ª - DO FORO
Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o Foro da Comarca de ${foro.comarcaCidadeUf || 'São Paulo/SP'}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, assinam o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com 2 (duas) testemunhas instrumentárias idôneas.

${foro.cidadeUf || 'São Paulo/SP'}, ${foro.dataExtenso || 'de 2026'}.

______________________________________________
LOCADOR(A): ${locador.nome || 'Iluminatto Moraes'}
CPF nº ${locador.cpf || '000.000.000-00'}

______________________________________________
LOCATÁRIO(A): ${locatario.nome || '[Nome do Inquilino]'}
CPF nº ${locatario.cpf || '[000.000.000-00]'}`;
}
