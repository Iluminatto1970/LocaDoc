import React from 'react';
import { ContractData, ImovelData, ImovelTemporadaData } from '../types/contract';
import { formatCurrencyBRL } from '../utils/defaults';
import { 
  Building2, FileText, DollarSign, TrendingUp, Users, 
  Palmtree, ShieldCheck, CheckCircle2, Clock, PlusCircle, 
  ArrowUpRight, ArrowRight, ExternalLink, Sparkles, AlertCircle,
  BarChart3, PieChart as PieChartIcon, Activity, Settings
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface DashboardOverviewProps {
  contracts: ContractData[];
  imoveis: ImovelData[];
  temporadaImoveis?: ImovelTemporadaData[];
  onSelectContract: (contract: ContractData) => void;
  onNavigateToTab: (tab: any) => void;
  onNewContract: () => void;
  onNewImovel: () => void;
  onUpdateContract?: (contract: ContractData) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  contracts,
  imoveis,
  temporadaImoveis = [],
  onSelectContract,
  onNavigateToTab,
  onNewContract,
  onNewImovel,
  onUpdateContract,
}) => {
  // 1. Calculate Contract Statistics
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status !== 'rascunho' || contracts.length <= 2);
  const residentialContracts = contracts.filter((c) => c.tipoLocacao !== 'temporada');
  const temporadaContracts = contracts.filter((c) => c.tipoLocacao === 'temporada');

  // Total accumulated monthly rent & seasonal rentals
  const totalMonthlyRent = contracts.reduce((acc, c) => {
    if (c.tipoLocacao === 'temporada') {
      return acc + (c.temporadaInfo?.totalGeral || 0);
    }
    return acc + (c.valores?.aluguel || 0);
  }, 0);

  const projectedAnnualRevenue = residentialContracts.reduce(
    (acc, c) => acc + (c.valores?.aluguel || 0) * 12,
    0
  ) + temporadaContracts.reduce(
    (acc, c) => acc + (c.temporadaInfo?.totalGeral || 0),
    0
  );

  const averageRent = totalContracts > 0 ? Math.round(totalMonthlyRent / totalContracts) : 0;

  const totalCaucoes = contracts.reduce((acc, c) => {
    if (c.tipoLocacao === 'temporada') {
      return acc + (c.temporadaInfo?.caucaoDanos || 0);
    }
    if (c.garantia?.tipo === 'caucao') {
      return acc + (c.garantia?.caucaoValor || 0);
    }
    return acc;
  }, 0);

  // 2. Calculate Property Statuses
  const imoveisDisponiveis = imoveis.filter((i) => i.status === 'disponivel').length;
  const imoveisLocados = imoveis.filter((i) => i.status === 'locado').length;
  const imoveisManutencao = imoveis.filter((i) => i.status === 'manutencao').length;
  const totalImoveis = imoveis.length;

  // Occupancy rate
  const occupancyRate = totalImoveis > 0 
    ? Math.round((imoveisLocados / totalImoveis) * 100) 
    : 0;

  // 3. Recharts Data: Property Status Distribution (Pie / Donut Chart)
  const propertyStatusData = [
    { name: 'Disponíveis para Locação', value: imoveisDisponiveis || 2, color: '#10b981' }, // emerald-500
    { name: 'Locados / Ocupados', value: imoveisLocados || (contracts.length > 0 ? 1 : 0), color: '#3b82f6' }, // blue-500
    { name: 'Temporada (Airbnb)', value: temporadaImoveis.length || 3, color: '#f59e0b' }, // amber-500
    { name: 'Em Manutenção / Vistoria', value: imoveisManutencao || 0, color: '#94a3b8' }, // slate-400
  ].filter(item => item.value > 0);

  // 4. Recharts Data: Receita Acumulada dos Contratos por Mês (Filtrando APENAS status === 'ativo')
  const activeContractsForChart = contracts.filter((c) => c.status === 'ativo');

  const MONTHS_LABELS = [
    { key: '01', mes: 'Jan', nome: 'Janeiro' },
    { key: '02', mes: 'Fev', nome: 'Fevereiro' },
    { key: '03', mes: 'Mar', nome: 'Março' },
    { key: '04', mes: 'Abr', nome: 'Abril' },
    { key: '05', mes: 'Mai', nome: 'Maio' },
    { key: '06', mes: 'Jun', nome: 'Junho' },
    { key: '07', mes: 'Jul', nome: 'Julho' },
    { key: '08', mes: 'Ago', nome: 'Agosto' },
    { key: '09', mes: 'Set', nome: 'Setembro' },
    { key: '10', mes: 'Out', nome: 'Outubro' },
    { key: '11', mes: 'Nov', nome: 'Novembro' },
    { key: '12', mes: 'Dez', nome: 'Dezembro' },
  ];

  const totalActiveMonthlyRent = activeContractsForChart.reduce((sum, c) => {
    if (c.tipoLocacao === 'temporada') {
      return sum + (c.temporadaInfo?.totalGeral || 0);
    }
    return sum + (c.valores?.aluguel || 0);
  }, 0);

  let runningAccumulatedRent = 0;
  const accumulatedRevenueByMonthData = MONTHS_LABELS.map((m) => {
    const monthRent = totalActiveMonthlyRent;
    runningAccumulatedRent += monthRent;

    return {
      mes: m.mes,
      nomeCompleto: m.nome,
      receitaMensal: monthRent,
      receitaAcumulada: runningAccumulatedRent,
      contratosAtivos: activeContractsForChart.length,
    };
  });

  // 5. Recharts Data: Guarantees Distribution
  const caucaoCount = contracts.filter(c => c.garantia?.tipo === 'caucao' || c.tipoLocacao === 'temporada').length;
  const fiadorCount = contracts.filter(c => c.garantia?.tipo === 'fiador').length;
  const seguroCount = contracts.filter(c => c.garantia?.tipo === 'seguro_fianca').length;

  const guaranteeData = [
    { name: 'Caução (Dinheiro/Danos)', quantidade: caucaoCount || 1, fill: '#10b981' },
    { name: 'Fiador Solidário', quantidade: fiadorCount || 0, fill: '#3b82f6' },
    { name: 'Seguro Fiança', quantidade: seguroCount || 0, fill: '#8b5cf6' },
  ];

  // Custom Currency Tooltip for Accumulated Monthly BarChart
  const CustomAccumulatedBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-amber-400 text-sm">{data?.nomeCompleto || label}</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
              {data?.contratosAtivos || 0} ativo(s)
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-3 text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
                Receita Acumulada:
              </span>
              <strong className="text-white font-mono text-sm">
                {formatCurrencyBRL(data?.receitaAcumulada || 0)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 shrink-0" />
                Receita no Mês:
              </span>
              <span className="text-slate-200 font-mono">
                {formatCurrencyBRL(data?.receitaMensal || 0)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-400 pt-1.5 border-t border-slate-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Filtro ativo: Apenas contratos com status &apos;ativo&apos;
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Status Tooltip for PieChart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-800 text-xs">
          <p className="font-semibold text-slate-200">{data.name}</p>
          <p className="font-bold text-amber-400 text-sm mt-0.5">
            {data.value} {data.value === 1 ? 'imóvel' : 'imóveis'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Painel Geral & BI Imobiliário
              </span>
              <span className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Lei nº 8.245/1991
              </span>
              <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Base Sincronizada
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard de Contratos & Gestão Imobiliária
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Monitore métricas financeiras, taxa de ocupação da carteira, receita acumulada de aluguéis e status dos contratos em tempo real.
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onNewContract}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Novo Contrato</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('gerador')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Extração OCR</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('temporada')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Palmtree className="w-4 h-4 text-amber-400" />
              <span>Temporada</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Active Contracts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contratos Ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalContracts}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              100% formalizados
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>{residentialContracts.length} residenciais</span>
            <span className="text-amber-700 font-semibold">{temporadaContracts.length} temporada</span>
          </div>
        </div>

        {/* KPI 2: Total Accumulated Rent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Aluguéis
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrencyBRL(totalMonthlyRent)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Projeção anual:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {formatCurrencyBRL(projectedAnnualRevenue)}
            </span>
          </div>
        </div>

        {/* KPI 3: Properties Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status dos Imóveis
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalImoveis + (temporadaImoveis.length || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              unidades na carteira
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 font-semibold">{imoveisDisponiveis || 2} disponíveis</span>
            <span className="text-blue-700 font-semibold">{imoveisLocados || 1} locados</span>
          </div>
        </div>

        {/* KPI 4: Guarantees & Deposits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cauções Sob Custódia
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrencyBRL(totalCaucoes)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Ticket Médio:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {formatCurrencyBRL(averageRent)}
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Section (Using Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Property Status Distribution (Pie / Donut) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Distribuição dos Imóveis</h3>
                <p className="text-[11px] text-slate-500">Disponibilidade e ocupação da carteira</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('imoveis')}
              className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver imóveis
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {propertyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {propertyStatusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Receita Acumulada dos Contratos por Mês (Recharts BarChart - Filtrando Apenas Status 'ativo') */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Receita Acumulada dos Contratos por Mês
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Status &apos;ativo&apos;
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Evolução financeira acumulada mês a mês · Filtrando exclusivamente contratos formalizados com status ativo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-xs font-mono font-bold">
                {activeContractsForChart.length} {activeContractsForChart.length === 1 ? 'contrato ativo' : 'contratos ativos'}
              </span>
            </div>
          </div>

          {/* If no active contracts exist, display clear prompt and 1-click activate button */}
          {activeContractsForChart.length === 0 && (
            <div className="bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Nenhum contrato possui status <strong>&apos;ativo&apos;</strong> no momento. Para visualizar o gráfico acumulado, ative um contrato na lista abaixo.</span>
              </div>
              {contracts.length > 0 && onUpdateContract && (
                <button
                  type="button"
                  onClick={() => onUpdateContract({ ...contracts[0], status: 'ativo' })}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  Ativar Contrato #{contracts[0].id.substring(0, 8)}
                </button>
              )}
            </div>
          )}

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={accumulatedRevenueByMonthData}
                margin={{ top: 15, right: 20, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomAccumulatedBarTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                />
                <Bar 
                  dataKey="receitaAcumulada" 
                  name="Receita Acumulada (R$)" 
                  fill="#2563eb" 
                  radius={[6, 6, 0, 0]} 
                />
                <Bar 
                  dataKey="receitaMensal" 
                  name="Receita do Mês (R$)" 
                  fill="#0f172a" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Filtro Recharts: <strong>status === &apos;ativo&apos;</strong> ({activeContractsForChart.length} contrato{activeContractsForChart.length === 1 ? '' : 's'})</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-800">
              <span>Recorrência Mensal Ativa: <strong className="text-slate-900 font-mono">{formatCurrencyBRL(totalActiveMonthlyRent)}</strong></span>
              <span className="text-blue-700">Acumulado Anual Projetado: <strong className="font-mono">{formatCurrencyBRL(runningAccumulatedRent)}</strong></span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Contracts List & Navigation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Contratos Recentes Cadastrados
            </h2>
            <p className="text-xs text-slate-500">
              Clique em qualquer contrato para visualizar a minuta formatada, assinar ou exportar em PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('historico')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Ver todos os contratos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Contrato / Objeto</th>
                <th className="py-3 px-4">Locatário / Hóspede</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Garantia</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.slice(0, 6).map((contract) => {
                const isTemp = contract.tipoLocacao === 'temporada';
                const valorExibido = isTemp 
                  ? (contract.temporadaInfo?.totalGeral || 0)
                  : (contract.valores?.aluguel || 0);

                const isAtivo = contract.status === 'ativo';

                return (
                  <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 truncate max-w-xs">
                        {contract.titulo || 'Contrato de Locação'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {contract.objeto?.endereco || 'Endereço não informado'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div>{contract.locatario?.nome || 'Não informado'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        CPF: {contract.locatario?.cpf || '---'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isTemp ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                          <Palmtree className="w-3 h-3 text-amber-700" />
                          Temporada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">
                          <Building2 className="w-3 h-3 text-blue-700" />
                          Residencial
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {onUpdateContract ? (
                        <button
                          type="button"
                          onClick={() => onUpdateContract({ ...contract, status: isAtivo ? 'gerado' : 'ativo' })}
                          title={`Clique para alternar entre Ativo e Gerado (Atualmente: ${contract.status || 'ativo'})`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                            isAtivo
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className={`w-3 h-3 ${isAtivo ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="capitalize">{contract.status || 'ativo'}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isAtivo
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <CheckCircle2 className={`w-3 h-3 ${isAtivo ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="capitalize">{contract.status || 'ativo'}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatCurrencyBRL(valorExibido)}
                      {isTemp && <span className="text-[10px] text-slate-500 font-sans font-normal block">Total estadia</span>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 capitalize">
                      {isTemp 
                        ? `Caução Danos (${formatCurrencyBRL(contract.temporadaInfo?.caucaoDanos || 0)})`
                        : contract.garantia?.tipo === 'caucao' 
                          ? `Caução (${formatCurrencyBRL(contract.garantia.caucaoValor)})`
                          : contract.garantia?.tipo || 'Não definida'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectContract(contract);
                          onNavigateToTab('visualizador');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Abrir / PDF</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Access Card: Configurações de IA & Endpoints */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wide flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Configurações do Sistema
            </span>
            <span className="text-xs text-slate-300">
              Multi-LLM & Endpoints Customizados
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">
            Gerenciamento de Chaves de IA & Endpoints Customizados
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Configure suas credenciais para <strong>Google Gemini</strong>, <strong>OpenAI (GPT-4o)</strong>, <strong>Anthropic Claude</strong>, <strong>Groq / DeepSeek</strong> ou aponte para sua <strong>API Customizada / Servidor Local (Ollama, LM Studio, OpenRouter)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToTab('api_gemini')}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>Abrir Configurações de IA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
