import React, { useState, useEffect } from 'react';
import { ImovelTemporadaData, ReservaTemporada, ContractData } from '../types/contract';
import { formatCurrencyBRL, numeroPorExtensoReais, calculateSHA256 } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { 
  Palmtree, Calendar, Users, MapPin, Star, ShieldCheck, Check, 
  Plus, Edit, Trash2, Key, Wifi, Clock, Sparkles, AlertCircle, 
  FileText, ExternalLink, QrCode, Copy, CheckCircle2, Search,
  ChevronRight, ArrowRight, Shield, X, Bed, Bath, Home, Coffee,
  Tv, Wind, Waves, Car, UtensilsCrossed, Lock, Share2
} from 'lucide-react';
import QRCode from 'qrcode';

interface TemporadaManagerProps {
  onContractGeneratedFromTemporada: (contract: ContractData) => void;
  onOpenContractViewer: (contractId: string) => void;
}

export const DEFAULT_TEMPORADA_IMOVEIS: ImovelTemporadaData[] = [
  {
    id: 'temp-01',
    userId: 'usr-master-iluminatto',
    titulo: 'Studio Design 150m da Praia com Varanda & Vista Mar',
    tipo: 'studio',
    cidadeUf: 'Santos/SP',
    bairro: 'Gonzaga',
    endereco: 'Av. Marechal Deodoro, 45, Studio 802, Gonzaga, Santos/SP, CEP: 11060-400',
    valorDiaria: 280,
    taxaLimpeza: 120,
    caucaoDanos: 400,
    capacidadeHospedes: 4,
    quartos: 1,
    camas: '1 Cama Queen + 1 Sofá-Cama Casal Confortável',
    banheiros: 1,
    horarioCheckIn: '15:00',
    horarioCheckOut: '11:00',
    minimoDiarias: 2,
    comodidades: [
      'Wi-Fi 500 Mbps',
      'Ar-Condicionado Split',
      'Fechadura Digital (Self Check-in)',
      'Smart TV 50" 4K',
      'Cozinha com Cooktop & Micro-ondas',
      'Piscina no Rooftop',
      'Vaga de Garagem Coberta',
      'Roupas de Cama e Banho Premium',
    ],
    regrasCasa: [
      'Proibido festas, confraternizações e eventos',
      'Lei do Silêncio obrigatória das 22h às 08h',
      'Imóvel 100% não fumante (sujeito a taxa de higienização)',
      'Apresentação de documento oficial de todos os hóspedes na portaria',
      'Permitido pet de pequeno porte sob aviso prévio',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
    descricao: 'Studio moderno totalmente reformado e decorado por arquiteto, a poucos passos da praia do Gonzaga. Prédio novo com portaria 24 horas, fechadura eletrônica para entrada autônoma a qualquer hora e área de lazer completa.',
    fechaduraDigitalSenha: '4782#',
    wifiRede: 'LocaDoc_Gonzaga_5G',
    wifiSenha: 'santos_temporada',
    avaliacaoMedia: 4.98,
    totalAvaliacoes: 64,
    status: 'disponivel',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'temp-02',
    userId: 'usr-master-iluminatto',
    titulo: 'Chalé Rústico com Lareira, Banheira de Hidro & Vista da Serra',
    tipo: 'chale',
    cidadeUf: 'Campos do Jordão/SP',
    bairro: 'Capivari',
    endereco: 'Rua das Araucárias, 320, Chalé 04, Capivari, Campos do Jordão/SP, CEP: 12460-000',
    valorDiaria: 540,
    taxaLimpeza: 160,
    caucaoDanos: 600,
    capacidadeHospedes: 2,
    quartos: 1,
    camas: '1 Cama King Size com Lençol Térmico',
    banheiros: 1,
    horarioCheckIn: '14:00',
    horarioCheckOut: '12:00',
    minimoDiarias: 2,
    comodidades: [
      'Lareira a Lenha (com cesto inicial incluso)',
      'Banheira de Hidromassagem Dupla com Vista',
      'Cafeteira Nespresso com Cápsulas',
      'Wi-Fi Fibra Alta Velocidade',
      'Smart TV 55" com Netflix & Prime',
      'Deck Panorâmico Privativo',
      'Adega Climatizada',
      'Estacionamento Privativo',
    ],
    regrasCasa: [
      'Proibido fumar no interior do chalé',
      'Cuidado ao manusear a lareira (utilizar proteção)',
      'Respeitar a tranquilidade da natureza e vizinhança',
      'Não são permitidos hóspedes adicionais além dos contratados',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    ],
    descricao: 'Refúgio romântico no coração de Campos do Jordão. Ambiente aconchegante com acabamento em madeira de demolição, hidro com vista panorâmica para as montanhas e lareira para noites inesquecíveis.',
    fechaduraDigitalSenha: '9134#',
    wifiRede: 'ChaleSerra_Hospedes',
    wifiSenha: 'inverno_campos',
    avaliacaoMedia: 5.0,
    totalAvaliacoes: 42,
    status: 'disponivel',
    createdAt: '2026-02-10T14:00:00.000Z',
    updatedAt: '2026-02-10T14:00:00.000Z',
  },
  {
    id: 'temp-03',
    userId: 'usr-master-iluminatto',
    titulo: 'Loft Conceito Faria Lima & Itaim - Piscina Borda Infinita',
    tipo: 'apartamento',
    cidadeUf: 'São Paulo/SP',
    bairro: 'Itaim Bibi',
    endereco: 'Rua Joaquim Floriano, 870, Apto 124, Itaim Bibi, São Paulo/SP, CEP: 04534-002',
    valorDiaria: 390,
    taxaLimpeza: 140,
    caucaoDanos: 500,
    capacidadeHospedes: 3,
    quartos: 1,
    camas: '1 Cama Queen + 1 Sofá Cama',
    banheiros: 1,
    horarioCheckIn: '15:00',
    horarioCheckOut: '11:00',
    minimoDiarias: 1,
    comodidades: [
      'Piscina com Borda Infinita no 24º Andar',
      'Academia LifeFitness Completa',
      'Wi-Fi 600 Mbps para Home Office',
      'Mesa de Trabalho Ergonômica',
      'Ar-Condicionado Inverter Quente/Frio',
      'Self Check-in 24 Horas com Portaria',
      'Vaga com Carregador para Carro Elétrico',
    ],
    regrasCasa: [
      'Proibido som alto e perturbação do sossego',
      'Uso da piscina e academia sujeito ao regimento interno',
      'Não é permitido fumar dentro da unidade',
      'Identificação prévia de todos os ocupantes',
    ],
    fotos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    ],
    descricao: 'Localização nobre no polo financeiro e gastronômico de São Paulo. A 5 minutos a pé dos melhores restaurantes do Itaim Bibi e da Av. Faria Lima. Condomínio com infraestrutura de hotel 5 estrelas.',
    fechaduraDigitalSenha: '6015#',
    wifiRede: 'ItaimLoft_Executive',
    wifiSenha: 'farialima_temporada',
    avaliacaoMedia: 4.96,
    totalAvaliacoes: 89,
    status: 'disponivel',
    createdAt: '2026-02-15T16:00:00.000Z',
    updatedAt: '2026-02-15T16:00:00.000Z',
  },
];

export const DEFAULT_RESERVAS: ReservaTemporada[] = [
  {
    id: 'res-demo-01',
    imovelId: 'temp-01',
    imovelTitulo: 'Studio Design 150m da Praia com Varanda & Vista Mar',
    imovelCidade: 'Santos/SP',
    userId: 'usr-hospede-mariana',
    hospedeNome: 'Mariana Duarte Costa',
    hospedeCpf: '987.654.321-99',
    hospedeEmail: 'mariana.duarte@gmail.com',
    hospedeTelefone: '(11) 98888-7744',
    dataCheckIn: '2026-11-12',
    dataCheckOut: '2026-11-16',
    quantidadeDiarias: 4,
    quantidadeHospedes: 2,
    valorDiaria: 280,
    subtotalDiarias: 1120,
    taxaLimpeza: 120,
    caucaoDanos: 400,
    valorTotal: 1640,
    status: 'confirmada',
    contratoId: 'contrato-temp-santos-01',
    hashSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    fechaduraDigitalCodigo: '4782#',
    wifiRede: 'LocaDoc_Gonzaga_5G',
    wifiSenha: 'santos_temporada',
    createdAt: '2026-10-15T14:20:00.000Z',
  },
];

export const TemporadaManager: React.FC<TemporadaManagerProps> = ({
  onContractGeneratedFromTemporada,
  onOpenContractViewer,
}) => {
  const { user } = useAuth();
  const isHost = user?.role !== 'cliente';

  const [activeSubTab, setActiveSubTab] = useState<'vitrine' | 'reservas' | 'anuncios'>('vitrine');

  const [imoveis, setImoveis] = useState<ImovelTemporadaData[]>(() => {
    const saved = localStorage.getItem('locadoc_temporada_imoveis');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_TEMPORADA_IMOVEIS;
  });

  const [reservas, setReservas] = useState<ReservaTemporada[]>(() => {
    const saved = localStorage.getItem('locadoc_temporada_reservas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_RESERVAS;
  });

  // Filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterHospedes, setFilterHospedes] = useState<number>(1);

  // Booking Modal State
  const [selectedImovelForBooking, setSelectedImovelForBooking] = useState<ImovelTemporadaData | null>(null);
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestCpf, setGuestCpf] = useState('');
  const [guestPhone, setGuestPhone] = useState('(11) 99876-5432');
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);
  const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(null);
  const [isGeneratingBooking, setIsGeneratingBooking] = useState(false);

  // Voucher Modal State
  const [selectedReservaForVoucher, setSelectedReservaForVoucher] = useState<ReservaTemporada | null>(null);
  const [voucherQrDataUrl, setVoucherQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Host Create/Edit Modal State
  const [showEditListingModal, setShowEditListingModal] = useState(false);
  const [listingErrorMessage, setListingErrorMessage] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<ImovelTemporadaData | null>(null);
  const [listingTitulo, setListingTitulo] = useState('');
  const [listingTipo, setListingTipo] = useState<ImovelTemporadaData['tipo']>('apartamento');
  const [listingCidade, setListingCidade] = useState('São Paulo/SP');
  const [listingBairro, setListingBairro] = useState('');
  const [listingEndereco, setListingEndereco] = useState('');
  const [listingValorDiaria, setListingValorDiaria] = useState(300);
  const [listingTaxaLimpeza, setListingTaxaLimpeza] = useState(120);
  const [listingCaucaoDanos, setListingCaucaoDanos] = useState(400);
  const [listingMaxHospedes, setListingMaxHospedes] = useState(4);
  const [listingQuartos, setListingQuartos] = useState(1);
  const [listingCamas, setListingCamas] = useState('1 Cama Queen + 1 Sofá-Cama');
  const [listingBanheiros, setListingBanheiros] = useState(1);
  const [listingCheckIn, setListingCheckIn] = useState('15:00');
  const [listingCheckOut, setListingCheckOut] = useState('11:00');
  const [listingMinDiarias, setListingMinDiarias] = useState(2);
  const [listingFechadura, setListingFechadura] = useState('1234#');
  const [listingWifiRede, setListingWifiRede] = useState('Hospedes_5G');
  const [listingWifiSenha, setListingWifiSenha] = useState('temporada123');
  const [listingDescricao, setListingDescricao] = useState('');
  const [listingRegras, setListingRegras] = useState('Proibido festas\nSilêncio das 22h às 08h\nNão fumante');
  const [listingComodidades, setListingComodidades] = useState('Wi-Fi 500MB, Ar-Condicionado, Cozinha Completa, Fechadura Digital, Smart TV');
  const [listingFotos, setListingFotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
  ]);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('locadoc_temporada_imoveis', JSON.stringify(imoveis));
  }, [imoveis]);

  useEffect(() => {
    localStorage.setItem('locadoc_temporada_reservas', JSON.stringify(reservas));
  }, [reservas]);

  // Sync to Firestore
  useEffect(() => {
    const syncFirestore = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'temporada_imoveis'));
        if (!querySnapshot.empty) {
          const list: ImovelTemporadaData[] = [];
          querySnapshot.forEach((d) => list.push(d.data() as ImovelTemporadaData));
          if (list.length > 0) setImoveis(list);
        }
      } catch (err) {
        console.warn('Sync Firestore temporada (modo local ativo):', err);
      }
    };
    syncFirestore();
  }, []);

  // Set default dates for booking when an imovel is selected
  const handleOpenBookingModal = (imovel: ImovelTemporadaData) => {
    setSelectedImovelForBooking(imovel);
    setBookingSuccessMessage(null);
    setBookingErrorMessage(null);

    // Default dates: next Friday to next Sunday (2 nights)
    const today = new Date();
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
    const nextSunday = new Date(nextFriday);
    nextSunday.setDate(nextFriday.getDate() + 2);

    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    setCheckInDate(formatYMD(nextFriday));
    setCheckOutDate(formatYMD(nextSunday));
    setGuestsCount(Math.min(2, imovel.capacidadeHospedes));
    setGuestName(user?.name || 'Mariana Duarte Costa');
    setGuestEmail(user?.email || 'mariana.duarte@gmail.com');
    setGuestCpf('987.654.321-99');
  };

  // Calculate nights
  const calculateNights = (inDate: string, outDate: string): number => {
    if (!inDate || !outDate) return 0;
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const nightsCount = calculateNights(checkInDate, checkOutDate);
  const subtotalDiarias = selectedImovelForBooking ? nightsCount * selectedImovelForBooking.valorDiaria : 0;
  const taxaLimpeza = selectedImovelForBooking?.taxaLimpeza || 0;
  const caucaoDanos = selectedImovelForBooking?.caucaoDanos || 0;
  const totalReserva = subtotalDiarias + taxaLimpeza + caucaoDanos;

  // Confirm booking & generate official Short-Term Contract (Lei 8.245/91, Art. 48)
  const handleConfirmBooking = async () => {
    if (!selectedImovelForBooking) return;
    setBookingErrorMessage(null);

    if (nightsCount <= 0) {
      setBookingErrorMessage('Selecione uma data de Check-out posterior à data de Check-in.');
      return;
    }
    if (nightsCount < selectedImovelForBooking.minimoDiarias) {
      setBookingErrorMessage(`Este imóvel exige estadia mínima de ${selectedImovelForBooking.minimoDiarias} diárias.`);
      return;
    }
    if (!guestName.trim() || !guestCpf.trim()) {
      setBookingErrorMessage('Informe o nome e CPF do hóspede principal para emissão do contrato perante a Lei do Inquilinato.');
      return;
    }

    setIsGeneratingBooking(true);

    try {
      const now = new Date();
      const reservaId = `res-${Date.now()}`;
      const contractId = `contrato-temp-${Date.now()}`;
      const hashDigest = await calculateSHA256(new Blob([`${reservaId}-${selectedImovelForBooking.id}-${checkInDate}-${checkOutDate}-${totalReserva}`]));

      const novaReserva: ReservaTemporada = {
        id: reservaId,
        imovelId: selectedImovelForBooking.id,
        imovelTitulo: selectedImovelForBooking.titulo,
        imovelCidade: selectedImovelForBooking.cidadeUf,
        userId: user?.id || 'usr-master-iluminatto',
        hospedeNome: guestName,
        hospedeCpf: guestCpf,
        hospedeEmail: guestEmail,
        hospedeTelefone: guestPhone,
        dataCheckIn: checkInDate,
        dataCheckOut: checkOutDate,
        quantidadeDiarias: nightsCount,
        quantidadeHospedes: guestsCount,
        valorDiaria: selectedImovelForBooking.valorDiaria,
        subtotalDiarias,
        taxaLimpeza,
        caucaoDanos,
        valorTotal: totalReserva,
        status: 'confirmada',
        contratoId: contractId,
        hashSha256: hashDigest,
        fechaduraDigitalCodigo: selectedImovelForBooking.fechaduraDigitalSenha || '1234#',
        wifiRede: selectedImovelForBooking.wifiRede || 'LocaDoc_WiFi',
        wifiSenha: selectedImovelForBooking.wifiSenha || 'temporada2026',
        createdAt: now.toISOString(),
      };

      // Generate complete short-term contract according to Brazilian Tenancy Law
      const shortTermContract: ContractData = {
        id: contractId,
        userId: user?.id || 'usr-master-iluminatto',
        imovelId: selectedImovelForBooking.id,
        tipoLocacao: 'temporada',
        titulo: `Contrato de Locação para Temporada - ${selectedImovelForBooking.titulo}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: 'pronto',
        temporadaInfo: {
          dataCheckIn: checkInDate,
          dataCheckOut: checkOutDate,
          horarioCheckIn: selectedImovelForBooking.horarioCheckIn,
          horarioCheckOut: selectedImovelForBooking.horarioCheckOut,
          quantidadeDiarias: nightsCount,
          valorDiaria: selectedImovelForBooking.valorDiaria,
          taxaLimpeza,
          caucaoDanos,
          totalGeral: totalReserva,
          maxHospedes: selectedImovelForBooking.capacidadeHospedes,
          regrasCasa: selectedImovelForBooking.regrasCasa,
          fechaduraDigitalSenha: selectedImovelForBooking.fechaduraDigitalSenha,
          wifiRede: selectedImovelForBooking.wifiRede,
          wifiSenha: selectedImovelForBooking.wifiSenha,
        },
        locador: {
          nome: 'Iluminatto Moraes',
          nacionalidade: 'Brasileiro',
          estadoCivil: 'Casado',
          profissao: 'Empresário / Administrador de Imóveis',
          rg: '28.456.789-0',
          orgaoExpedidor: 'SSP/SP',
          cpf: '123.456.789-00',
          endereco: 'Alameda dos Anapurus, 1200, Moema, São Paulo/SP, CEP: 04087-003',
          telefone: '(11) 98765-4321',
          email: 'iluminatto@gmail.com',
        },
        locatario: {
          nome: guestName,
          nacionalidade: 'Brasileiro(a)',
          estadoCivil: 'Solteiro(a)',
          profissao: 'Profissional Liberal / Hóspede',
          rg: '34.890.123-4',
          orgaoExpedidor: 'SSP/SP',
          cpf: guestCpf,
          endereco: 'Endereço fornecido pelo hóspede',
          telefone: guestPhone,
          email: guestEmail,
        },
        objeto: {
          endereco: selectedImovelForBooking.endereco,
          compostos: `Imóvel destinado exclusivamente para temporada residencial (turismo, lazer ou trabalho). Acomoda até ${selectedImovelForBooking.capacidadeHospedes} hóspedes. Camas: ${selectedImovelForBooking.camas}. Garagem inclusa.`,
        },
        prazo: {
          vigenciaMeses: 0,
          dataInicio: `${checkInDate.split('-').reverse().join('/')} às ${selectedImovelForBooking.horarioCheckIn}`,
          dataTermino: `${checkOutDate.split('-').reverse().join('/')} às ${selectedImovelForBooking.horarioCheckOut}`,
        },
        valores: {
          aluguel: totalReserva,
          aluguelExtenso: numeroPorExtensoReais(totalReserva),
          diaVencimento: 1, // Pagamento antecipado conforme Art. 49 da Lei 8.245/91
          chavePix: 'iluminatto@gmail.com',
          banco: 'Banco Itaú S.A. (341)',
          agencia: '0450',
          conta: '12345-6',
          tipoConta: 'Conta Corrente',
          indiceReajuste: 'IPCA',
        },
        vistoriaDigital: {
          linkNuvem: 'https://drive.google.com/drive/folders/locadoc-temporada-vistoria',
          hashSha256: hashDigest,
          prazoContestacaoHoras: 24, // 24h para contestação inicial em estadias curtas
        },
        garantia: {
          tipo: 'caucao',
          caucaoValor: caucaoDanos,
          caucaoValorExtenso: numeroPorExtensoReais(caucaoDanos),
          caucaoMeses: 1,
          caucaoContaPoupanca: 'Chave PIX: iluminatto@gmail.com (Depósito Caução de Danos)',
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
          comarcaCidadeUf: selectedImovelForBooking.cidadeUf,
          cidadeUf: selectedImovelForBooking.cidadeUf,
          dataExtenso: `${selectedImovelForBooking.cidadeUf}, ${now.getDate()} de Outubro de 2026`,
        },
        testemunhas: [
          { nome: 'Carlos Silva Oliveira', cpf: '234.567.890-11' },
          { nome: 'Patrícia Mendes Souza', cpf: '345.678.901-22' },
        ],
        inventario: selectedImovelForBooking.comodidades.map((comodidade, idx) => ({
          id: `item-temp-${idx}`,
          comodo: 'Área do Imóvel / Temporada',
          item: comodidade,
          marcaModelo: 'Equipamento e Mobília Padrão Airbnb Plus',
          estado: 'Perfeito funcionamento e higienizado',
          observacoes: 'Inventariado para check-in e check-out',
        })),
        vistoLocador: 'Iluminatto',
        vistoLocatario: guestName.split(' ')[0],
      };

      // Save reservation
      setReservas((prev) => [novaReserva, ...prev]);

      // Push contract to app state & notify parent
      onContractGeneratedFromTemporada(shortTermContract);

      // Save to Firestore
      try {
        await setDoc(doc(db, 'temporada_reservas', novaReserva.id), novaReserva);
        await setDoc(doc(db, 'contracts', shortTermContract.id), shortTermContract);
      } catch (e) {
        console.warn('Erro ao salvar no Firestore:', e);
      }

      setBookingSuccessMessage('Reserva confirmada com sucesso! O Contrato Oficial para Temporada (Lei 8.245/91) e o Voucher de Check-in foram emitidos.');

      setTimeout(() => {
        setSelectedImovelForBooking(null);
        setSelectedReservaForVoucher(novaReserva);
        generateVoucherQr(novaReserva);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setBookingErrorMessage('Erro ao processar reserva: ' + (err?.message || 'Falha inesperada. Tente novamente.'));
    } finally {
      setIsGeneratingBooking(false);
    }
  };

  // Generate QR Code for Voucher
  const generateVoucherQr = async (reserva: ReservaTemporada) => {
    try {
      const qrPayload = JSON.stringify({
        reservaId: reserva.id,
        imovel: reserva.imovelTitulo,
        hospede: reserva.hospedeNome,
        checkIn: `${reserva.dataCheckIn} (15:00)`,
        checkOut: `${reserva.dataCheckOut} (11:00)`,
        hashSha256: reserva.hashSha256?.substring(0, 16),
        fechadura: reserva.fechaduraDigitalCodigo,
      });
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setVoucherQrDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenVoucherModal = (reserva: ReservaTemporada) => {
    setSelectedReservaForVoucher(reserva);
    generateVoucherQr(reserva);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filter listings
  const filteredImoveis = imoveis.filter((item) => {
    const matchesSearch = 
      item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cidadeUf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bairro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = filterTipo === 'todos' || item.tipo === filterTipo;
    const matchesHospedes = item.capacidadeHospedes >= filterHospedes;

    return matchesSearch && matchesTipo && matchesHospedes;
  });

  // Host modal open
  const handleOpenNewListingModal = () => {
    setEditingListing(null);
    setListingTitulo('');
    setListingTipo('apartamento');
    setListingCidade('São Paulo/SP');
    setListingBairro('Pinheiros');
    setListingEndereco('Rua dos Pinheiros, 500, São Paulo/SP');
    setListingValorDiaria(320);
    setListingTaxaLimpeza(120);
    setListingCaucaoDanos(400);
    setListingMaxHospedes(4);
    setListingQuartos(1);
    setListingCamas('1 Cama Queen + 1 Sofá-Cama');
    setListingBanheiros(1);
    setListingCheckIn('15:00');
    setListingCheckOut('11:00');
    setListingMinDiarias(2);
    setListingFechadura('5821#');
    setListingWifiRede('Pinheiros_Hospedes_5G');
    setListingWifiSenha('pinheiros2026');
    setListingDescricao('Excelente apartamento novo para locação por temporada. Equipado com ar-condicionado, Wi-Fi veloz e self check-in com fechadura digital.');
    setListingRegras('Proibido festas\nSilêncio das 22h às 08h\nNão fumante\nAnimais permitidos sob consulta');
    setListingComodidades('Wi-Fi 500MB, Ar-Condicionado Split, Fechadura Digital, Smart TV 50", Cozinha Equipada, Vaga de Garagem');
    setListingErrorMessage(null);
    setShowEditListingModal(true);
  };

  const handleSaveListing = async () => {
    setListingErrorMessage(null);
    if (!listingTitulo.trim() || !listingCidade.trim() || listingValorDiaria <= 0) {
      setListingErrorMessage('Preencha os campos obrigatórios: título, cidade e o valor da diária.');
      return;
    }

    const id = editingListing ? editingListing.id : `temp-${Date.now()}`;
    const regrasArray = listingRegras.split('\n').filter((r) => r.trim().length > 0);
    const comodidadesArray = listingComodidades.split(',').map((c) => c.trim()).filter((c) => c.length > 0);

    const novoImovel: ImovelTemporadaData = {
      id,
      userId: user?.id || 'usr-master-iluminatto',
      titulo: listingTitulo,
      tipo: listingTipo,
      cidadeUf: listingCidade,
      bairro: listingBairro,
      endereco: listingEndereco,
      valorDiaria: listingValorDiaria,
      taxaLimpeza: listingTaxaLimpeza,
      caucaoDanos: listingCaucaoDanos,
      capacidadeHospedes: listingMaxHospedes,
      quartos: listingQuartos,
      camas: listingCamas,
      banheiros: listingBanheiros,
      horarioCheckIn: listingCheckIn,
      horarioCheckOut: listingCheckOut,
      minimoDiarias: listingMinDiarias,
      comodidades: comodidadesArray,
      regrasCasa: regrasArray,
      fotos: listingFotos,
      descricao: listingDescricao,
      fechaduraDigitalSenha: listingFechadura,
      wifiRede: listingWifiRede,
      wifiSenha: listingWifiSenha,
      avaliacaoMedia: editingListing?.avaliacaoMedia || 5.0,
      totalAvaliacoes: editingListing?.totalAvaliacoes || 1,
      status: 'disponivel',
      createdAt: editingListing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingListing) {
      setImoveis((prev) => prev.map((im) => (im.id === id ? novoImovel : im)));
    } else {
      setImoveis((prev) => [novoImovel, ...prev]);
    }

    try {
      await setDoc(doc(db, 'temporada_imoveis', id), novoImovel);
    } catch (e) {
      console.warn('Erro ao salvar no Firestore:', e);
    }

    setShowEditListingModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-amber-400" />
                Locação para Temporada & Diárias (Tipo Airbnb)
              </span>
              <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Lei nº 8.245/1991, Arts. 48 a 50
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Aluguel por Temporada, Dias & Estadias Curtas
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore estúdios, chalés e apartamentos mobiliados para locação por diárias.
              Simule datas de Check-in e Check-out, calcule valores de estadia e taxa de limpeza, 
              e emita o <strong className="text-amber-400">Contrato Oficial de Temporada</strong> com Voucher de Fechadura Digital e Vistoria SHA-256.
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <div className="bg-slate-800/90 p-1 rounded-2xl border border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('vitrine')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'vitrine'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Explorar Imóveis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('reservas')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'reservas'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Minhas Reservas ({reservas.length})</span>
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('anuncios')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'anuncios'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Gerenciar Anúncios</span>
                </button>
              )}
            </div>

            {isHost && (
              <button
                type="button"
                onClick={handleOpenNewListingModal}
                className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Cadastrar Novo Imóvel por Temporada</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: VITRINE / EXPLORAR IMOVEIS POR TEMPORADA */}
      {activeSubTab === 'vitrine' && (
        <div className="space-y-6">
          
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busque por praia, cidade (Santos, Campos do Jordão, SP), bairro ou palavras-chave..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Filter Tipo */}
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="py-2.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="studio">Studio / Flat</option>
                <option value="apartamento">Apartamento</option>
                <option value="chale">Chalé de Serra</option>
                <option value="casa">Casa</option>
              </select>

              {/* Filter Hospedes */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 whitespace-nowrap">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Hóspedes:</span>
                <select
                  value={filterHospedes}
                  onChange={(e) => setFilterHospedes(parseInt(e.target.value))}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none"
                >
                  <option value={1}>1+</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImoveis.map((imovel) => (
              <div
                key={imovel.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Photo Carousel or Thumbnail */}
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    <img
                      src={imovel.fotos[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'}
                      alt={imovel.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-white/95 backdrop-blur-md text-slate-900 rounded-lg shadow-sm flex items-center gap-1">
                        <Palmtree className="w-3 h-3 text-amber-600" />
                        <span>Temporada</span>
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white rounded-md uppercase">
                        {imovel.tipo}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg shadow-sm flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-slate-950" />
                        <span>{imovel.avaliacaoMedia?.toFixed(2) || '5.00'}</span>
                        <span className="text-[10px] text-slate-800 font-normal">({imovel.totalAvaliacoes || 12})</span>
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{imovel.bairro}, {imovel.cidadeUf}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Users className="w-3 h-3 text-amber-300" />
                        <span>Até {imovel.capacidadeHospedes} pessoas</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                      {imovel.titulo}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {imovel.descricao}
                    </p>

                    {/* Features Badges */}
                    <div className="flex items-center gap-3 text-xs text-slate-600 py-2 border-y border-slate-100 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                        <span>{imovel.camas.split('+')[0]}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Bath className="w-3.5 h-3.5 text-slate-400" />
                        <span>{imovel.banheiros} banh.</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <Key className="w-3.5 h-3.5" />
                        <span>Self Check-in</span>
                      </span>
                    </div>

                    {/* Top Amenities Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {imovel.comodidades.slice(0, 3).map((comodidade, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-md font-medium"
                        >
                          {comodidade}
                        </span>
                      ))}
                      {imovel.comodidades.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-semibold">
                          +{imovel.comodidades.length - 3} itens
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & CTA */}
                <div className="p-5 pt-0">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          {formatCurrencyBRL(imovel.valorDiaria)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">/ noite</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        + Taxa limpeza: {formatCurrencyBRL(imovel.taxaLimpeza)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenBookingModal(imovel)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Simular & Reservar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: RESERVAS & VOUCHERS */}
      {activeSubTab === 'reservas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reservas por Temporada & Vouchers de Acesso
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe check-ins, contratos emitidos e credenciais de fechadura digital
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-lg">
              {reservas.length} reserva(s) registradas
            </span>
          </div>

          <div className="space-y-3">
            {reservas.map((reserva) => (
              <div
                key={reserva.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {reserva.imovelTitulo}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Estadia Confirmada
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Cód: {reserva.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Check-in</span>
                      <span className="font-bold text-slate-800">{reserva.dataCheckIn.split('-').reverse().join('/')} (15h)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Check-out</span>
                      <span className="font-bold text-slate-800">{reserva.dataCheckOut.split('-').reverse().join('/')} (11h)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Diárias & Hóspedes</span>
                      <span className="font-bold text-slate-800">{reserva.quantidadeDiarias} noites ({reserva.quantidadeHospedes} pessoas)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total com Limpeza</span>
                      <span className="font-bold text-emerald-700 font-mono">{formatCurrencyBRL(reserva.valorTotal)}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-1">
                    <span>Hóspede Titular: <strong>{reserva.hospedeNome}</strong> (CPF: {reserva.hospedeCpf})</span>
                    <span className="mx-2">·</span>
                    <span>Destino: <strong>{reserva.imovelCidade}</strong></span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenVoucherModal(reserva)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Voucher & Fechadura</span>
                  </button>

                  {reserva.contratoId && (
                    <button
                      type="button"
                      onClick={() => onOpenContractViewer(reserva.contratoId!)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Contrato</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: ANÚNCIOS DO ANFITRIÃO */}
      {activeSubTab === 'anuncios' && isHost && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Painel do Anfitrião — Gerenciar Imóveis por Temporada
              </h2>
              <p className="text-xs text-slate-500">
                Configure diárias, taxas de limpeza, senhas de fechadura digital e comodidades de cada imóvel
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewListingModal}
              className="px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Adicionar Imóvel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {imoveis.map((im) => (
              <div
                key={im.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={im.fotos[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80'}
                      alt={im.titulo}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{im.titulo}</h4>
                      <p className="text-[11px] text-slate-500">{im.cidadeUf} • {im.bairro}</p>
                      <p className="text-xs font-bold text-amber-800 font-mono mt-0.5">
                        {formatCurrencyBRL(im.valorDiaria)} / noite
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                    {im.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>Fechadura: <strong className="font-mono">{im.fechaduraDigitalSenha || '1234#'}</strong></span>
                  <span>Wi-Fi: <strong>{im.wifiRede}</strong></span>
                  <span>Limpeza: <strong>{formatCurrencyBRL(im.taxaLimpeza)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: BOOKING & SHORT-TERM CONTRACT SIMULATOR */}
      {selectedImovelForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Reserva de Temporada & Contrato Digital</h3>
                  <p className="text-[11px] text-slate-300 truncate max-w-md">
                    {selectedImovelForBooking.titulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImovelForBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Dates & Guests Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Período da Estadia & Ocupantes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Data de Check-in (Entrada)
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Horário: a partir das {selectedImovelForBooking.horarioCheckIn}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Data de Check-out (Saída)
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Horário: até às {selectedImovelForBooking.horarioCheckOut}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quantidade de Hóspedes
                    </label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                    >
                      {Array.from({ length: selectedImovelForBooking.capacidadeHospedes }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'Hóspede' : 'Hóspedes'} (Máx. {selectedImovelForBooking.capacidadeHospedes})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {selectedImovelForBooking.camas}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest Qualification Data */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Dados do Hóspede Principal (Para o Contrato e Portaria)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ex: Mariana Duarte Costa"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">CPF (Obrigatório)</label>
                    <input
                      type="text"
                      value={guestCpf}
                      onChange={(e) => setGuestCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Live Price Breakdown & Calculation */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                  3. Discriminação Financeira da Locação por Temporada
                </span>

                <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                  <div className="flex justify-between">
                    <span>
                      {nightsCount} {nightsCount === 1 ? 'diária' : 'diárias'} × {formatCurrencyBRL(selectedImovelForBooking.valorDiaria)}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyBRL(subtotalDiarias)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Taxa única de limpeza e higienização:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyBRL(taxaLimpeza)}
                    </span>
                  </div>

                  <div className="flex justify-between text-amber-800">
                    <span>Caução garantia de danos (Reembolsável no check-out):</span>
                    <span className="font-mono font-bold">
                      {formatCurrencyBRL(caucaoDanos)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex justify-between text-sm font-extrabold text-slate-950">
                    <span>Total da Reserva & Contrato:</span>
                    <span className="font-mono text-base text-amber-900">
                      {formatCurrencyBRL(totalReserva)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-800/80 leading-relaxed pt-1">
                  * Conforme o Art. 49 da Lei nº 8.245/1991, na locação para temporada o locador poderá receber o aluguel e encargos previamente e de uma só vez.
                </p>
              </div>

              {/* Error Alert */}
              {bookingErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{bookingErrorMessage}</span>
                </div>
              )}

              {/* Success Alert */}
              {bookingSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bookingSuccessMessage}</span>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedImovelForBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isGeneratingBooking || nightsCount <= 0}
                onClick={handleConfirmBooking}
                className="px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isGeneratingBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Emitindo Contrato & Voucher...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Reserva & Gerar Contrato de Temporada</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: VOUCHER DE CHECK-IN & GUIA DA CASA */}
      {selectedReservaForVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-amber-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Voucher Oficial de Check-in & Guia da Casa</h3>
                  <p className="text-[11px] text-amber-200">
                    Apresente na portaria ou utilize para self check-in autônomo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservaForVoucher(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voucher Body (Printable & Shareable) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1" id="voucher-print-area">
              
              {/* Boarding Pass Style Card */}
              <div className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                      Imóvel por Temporada
                    </span>
                    <h4 className="text-base font-bold text-slate-950">
                      {selectedReservaForVoucher.imovelTitulo}
                    </h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>{selectedReservaForVoucher.imovelCidade}</span>
                    </p>
                  </div>

                  {voucherQrDataUrl && (
                    <div className="shrink-0 flex flex-col items-center">
                      <img src={voucherQrDataUrl} alt="QR Code Check-in" className="w-24 h-24 rounded-lg bg-white p-1 border border-amber-200" />
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">QR Portaria</span>
                    </div>
                  )}
                </div>

                {/* Key Access Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Senha da Fechadura Digital</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedReservaForVoucher.fechaduraDigitalCodigo || '1234#', 'fechadura')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copiar senha"
                      >
                        {copiedKey === 'fechadura' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-xl font-mono font-black text-amber-900 mt-1 tracking-wider">
                      {selectedReservaForVoucher.fechaduraDigitalCodigo || '1234#'}
                    </p>
                    <span className="text-[10px] text-slate-400">Digite no teclado da porta seguido de #</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-blue-600" />
                        <span>Wi-Fi de Alta Velocidade</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${selectedReservaForVoucher.wifiRede} / Senha: ${selectedReservaForVoucher.wifiSenha}`, 'wifi')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copiar dados Wi-Fi"
                      >
                        {copiedKey === 'wifi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">
                      Rede: {selectedReservaForVoucher.wifiRede || 'LocaDoc_WiFi'}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      Senha: <strong>{selectedReservaForVoucher.wifiSenha || 'temporada2026'}</strong>
                    </p>
                  </div>
                </div>

                {/* Dates strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-amber-200 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Check-in</span>
                    <strong className="text-slate-900">{selectedReservaForVoucher.dataCheckIn.split('-').reverse().join('/')} (15:00)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Check-out</span>
                    <strong className="text-slate-900">{selectedReservaForVoucher.dataCheckOut.split('-').reverse().join('/')} (11:00)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hóspedes</span>
                    <strong className="text-slate-900">{selectedReservaForVoucher.quantidadeHospedes} pessoa(s)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Pago</span>
                    <strong className="text-emerald-700 font-mono">{formatCurrencyBRL(selectedReservaForVoucher.valorTotal)}</strong>
                  </div>
                </div>

                {/* SHA-256 seal */}
                {selectedReservaForVoucher.hashSha256 && (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                    <span className="truncate max-w-sm">
                      Hash SHA-256 do Contrato: {selectedReservaForVoucher.hashSha256}
                    </span>
                    <span className="text-emerald-700 font-bold shrink-0">Inviolabilidade Criptográfica</span>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReservaForVoucher(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Voucher de Check-in - ${selectedReservaForVoucher.imovelTitulo}\nCheck-in: ${selectedReservaForVoucher.dataCheckIn} às 15h\nCheck-out: ${selectedReservaForVoucher.dataCheckOut} às 11h\nFechadura Digital: ${selectedReservaForVoucher.fechaduraDigitalCodigo}\nWi-Fi: ${selectedReservaForVoucher.wifiRede} (Senha: ${selectedReservaForVoucher.wifiSenha})\nLocaDoc Gestão de Temporada`;
                    copyToClipboard(text, 'share');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedKey === 'share' ? 'Copiado!' : 'Compartilhar WhatsApp'}</span>
                </button>

                {selectedReservaForVoucher.contratoId && (
                  <button
                    type="button"
                    onClick={() => {
                      const cid = selectedReservaForVoucher.contratoId!;
                      setSelectedReservaForVoucher(null);
                      onOpenContractViewer(cid);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visualizar Contrato Completo</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: ANFITRIÃO - CADASTRAR/EDITAR ANÚNCIO DE TEMPORADA */}
      {showEditListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">Cadastrar Imóvel para Locação por Temporada</h3>
              <button
                type="button"
                onClick={() => setShowEditListingModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {listingErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{listingErrorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Anúncio (Airbnb style)</label>
                <input
                  type="text"
                  value={listingTitulo}
                  onChange={(e) => setListingTitulo(e.target.value)}
                  placeholder="Ex: Studio Luxo 100m da Praia com Sacada Gourmet"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Imóvel</label>
                  <select
                    value={listingTipo}
                    onChange={(e) => setListingTipo(e.target.value as any)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="studio">Studio / Flat</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="chale">Chalé</option>
                    <option value="cobertura">Cobertura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={listingCidade}
                    onChange={(e) => setListingCidade(e.target.value)}
                    placeholder="Ex: Santos/SP"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={listingBairro}
                    onChange={(e) => setListingBairro(e.target.value)}
                    placeholder="Ex: Gonzaga"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Diária (R$/noite)</label>
                  <input
                    type="number"
                    value={listingValorDiaria}
                    onChange={(e) => setListingValorDiaria(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taxa de Limpeza (R$)</label>
                  <input
                    type="number"
                    value={listingTaxaLimpeza}
                    onChange={(e) => setListingTaxaLimpeza(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Caução de Danos (R$)</label>
                  <input
                    type="number"
                    value={listingCaucaoDanos}
                    onChange={(e) => setListingCaucaoDanos(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Máx. Hóspedes</label>
                  <input
                    type="number"
                    value={listingMaxHospedes}
                    onChange={(e) => setListingMaxHospedes(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Fechadura Digital</label>
                  <input
                    type="text"
                    value={listingFechadura}
                    onChange={(e) => setListingFechadura(e.target.value)}
                    placeholder="Ex: 4892#"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wi-Fi (Rede / Senha)</label>
                  <input
                    type="text"
                    value={listingWifiRede}
                    onChange={(e) => setListingWifiRede(e.target.value)}
                    placeholder="Nome da Rede Wi-Fi"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comodidades (Separadas por vírgula)</label>
                <input
                  type="text"
                  value={listingComodidades}
                  onChange={(e) => setListingComodidades(e.target.value)}
                  placeholder="Wi-Fi, Ar-Condicionado, Smart TV, Piscina..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Completa</label>
                <textarea
                  rows={3}
                  value={listingDescricao}
                  onChange={(e) => setListingDescricao(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditListingModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveListing}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
              >
                Salvar Anúncio
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
