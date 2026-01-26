
import React, { useMemo, useState } from 'react';
import { AttendanceLog, Configuration } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Target, Zap, Calendar as CalendarIcon, ArrowRight, RefreshCw, Landmark, User } from 'lucide-react';

interface AnalyticsTabProps {
  logs: AttendanceLog[];
  config: Configuration;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ logs, config }) => {
  // Filtros de fecha
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtros de Dimensión
  const [filterSedeId, setFilterSedeId] = useState('');
  const [filterModeloId, setFilterModeloId] = useState('');

  // Modelos disponibles basados en la sede filtrada
  const filteredConfigModelos = useMemo(() => {
    if (!filterSedeId) return config.modelos;
    return config.modelos.filter(m => m.sedeId === filterSedeId);
  }, [config.modelos, filterSedeId]);

  // Aplicación de todos los filtros a los logs
  const filteredLogs = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return logs.filter(l => {
      const logDate = new Date(l.date);
      const matchesDate = logDate >= start && logDate <= end;
      const matchesSede = filterSedeId === '' || l.sedeId === filterSedeId;
      const matchesModelo = filterModeloId === '' || l.modeloId === filterModeloId;
      
      return matchesDate && matchesSede && matchesModelo;
    });
  }, [logs, startDate, endDate, filterSedeId, filterModeloId]);

  // Cálculo de estadísticas
  const stats = useMemo(() => {
    const totalTokens = filteredLogs.reduce((acc, l) => acc + (Number(l.totalTokens) || 0), 0);
    const totalHours = filteredLogs.reduce((acc, l) => acc + (Number(l.horasConexion) || 0), 0);
    const efficiency = totalHours > 0 ? (totalTokens / totalHours).toFixed(1) : "0";
    
    // Distribución por Sede
    const sedeMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.sedeName || 'Sin Sede';
      sedeMap[name] = (sedeMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const topSedeEntry = Object.entries(sedeMap).sort((a, b) => b[1] - a[1])[0];
    const topSede = topSedeEntry ? topSedeEntry[0] : 'N/A';

    // Distribución por Modelo
    const modelMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.modeloName || 'Desconocida';
      modelMap[name] = (modelMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const topModelEntry = Object.entries(modelMap).sort((a, b) => b[1] - a[1])[0];
    const topModel = topModelEntry ? topModelEntry[0] : 'N/A';

    // Datos para Gráfico de Plataformas
    const platformDataMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.plataformaName || 'Otros';
      platformDataMap[name] = (platformDataMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const platformData = Object.entries(platformDataMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Datos para Gráfico de Torta
    const sedeData = Object.entries(sedeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalTokens, totalHours, efficiency, topSede, topModel, platformData, sedeData };
  }, [filteredLogs]);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#fb923c', '#facc15', '#22c55e'];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Panel de Indicadores</h2>
          <p className="text-slate-400">Análisis detallado de rendimiento por sede y modelo.</p>
        </div>
        
        {/* Barra de Filtros Multifunción */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-2xl w-full xl:w-auto">
          {/* Sede */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2">
            <Landmark size={14} className="text-indigo-400" />
            <select 
              value={filterSedeId}
              onChange={(e) => { setFilterSedeId(e.target.value); setFilterModeloId(''); }}
              className="bg-slate-800 text-white text-xs font-medium outline-none focus:ring-0 min-w-[120px] cursor-pointer"
            >
              <option value="" className="bg-slate-800 text-white">Todas las Sedes</option>
              {config.sedes.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-800 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2">
            <User size={14} className="text-emerald-400" />
            <select 
              value={filterModeloId}
              disabled={!filterSedeId && config.modelos.length > 50}
              onChange={(e) => setFilterModeloId(e.target.value)}
              className="bg-slate-800 text-white text-xs font-medium outline-none focus:ring-0 min-w-[120px] disabled:opacity-40 cursor-pointer"
            >
              <option value="" className="bg-slate-800 text-white">Todos los Modelos</option>
              {filteredConfigModelos.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-800 text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Divisor Visual */}
          <div className="hidden md:block w-px h-6 bg-slate-700 mx-1"></div>

          {/* Fechas */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2">
            <CalendarIcon size={14} className="text-indigo-400" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 text-white text-[11px] font-mono outline-none rounded p-1"
            />
            <ArrowRight size={12} className="text-slate-500" />
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 text-white text-[11px] font-mono outline-none rounded p-1"
            />
          </div>

          <button 
            onClick={() => { setFilterSedeId(''); setFilterModeloId(''); }}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
            title="Limpiar filtros"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Tokens" value={stats.totalTokens.toLocaleString()} subtitle="Producción del periodo" icon={TrendingUp} color="emerald" />
        <KPICard title="Eficiencia (T/H)" value={`${stats.efficiency}`} subtitle="Tokens por hora de conexión" icon={Zap} color="indigo" />
        <KPICard title="Sede Líder" value={stats.topSede} subtitle="Mayor volumen" icon={Target} color="rose" />
        <KPICard title="Modelo Top" value={stats.topModel} subtitle="Rendimiento destacado" icon={Users} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Barras */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Producción por Plataforma</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Valor en Tokens</span>
          </div>
          <div className="h-80">
            {stats.platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#334155', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {stats.platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataPlaceholder />
            )}
          </div>
        </div>

        {/* Gráfico de Torta */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Cuota de Producción</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Distribución de Mercado</span>
          </div>
          <div className="h-80 flex flex-col md:flex-row items-center justify-center">
            {stats.sedeData.length > 0 ? (
              <>
                <div className="flex-1 h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.sedeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {stats.sedeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 p-4 min-w-[180px] bg-slate-900/40 rounded-2xl border border-slate-700/50">
                  {stats.sedeData.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[11px] text-slate-400 truncate">{entry.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-200">{((entry.value / stats.totalTokens) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <NoDataPlaceholder />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const NoDataPlaceholder = () => (
  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
    <RefreshCw size={32} className="mb-3 opacity-20 animate-spin-slow" />
    <p>No hay datos registrados para los filtros actuales</p>
  </div>
);

const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorMap[color]} shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-slate-800/40 backdrop-blur-sm`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
          <h4 className="text-2xl font-black text-white mb-1 truncate">{value}</h4>
          <p className="text-slate-400 text-[10px] font-medium opacity-60">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color].split(' ')[0]} border shadow-inner`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};
