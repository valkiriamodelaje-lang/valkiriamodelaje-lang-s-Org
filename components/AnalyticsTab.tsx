
import React, { useMemo, useState } from 'react';
import { AttendanceLog, Configuration } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Target, Zap, Calendar as CalendarIcon, ArrowRight, RefreshCw } from 'lucide-react';

interface AnalyticsTabProps {
  logs: AttendanceLog[];
  config: Configuration;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ logs }) => {
  // Inicializa el rango de fechas (últimos 30 días hasta hoy)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filtrado robusto de logs basado en el rango seleccionado
  const filteredLogs = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Asegura incluir todo el día final
    
    return logs.filter(l => {
      const logDate = new Date(l.date);
      return logDate >= start && logDate <= end;
    });
  }, [logs, startDate, endDate]);

  // Cálculo de estadísticas globales e indicadores clave (KPIs)
  const stats = useMemo(() => {
    const totalTokens = filteredLogs.reduce((acc, l) => acc + (Number(l.totalTokens) || 0), 0);
    const totalHours = filteredLogs.reduce((acc, l) => acc + (Number(l.horasConexion) || 0), 0);
    const efficiency = totalHours > 0 ? (totalTokens / totalHours).toFixed(1) : "0";
    
    // Sede Líder en Tokens
    const sedeMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.sedeName || 'Sin Sede';
      sedeMap[name] = (sedeMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const topSedeEntry = Object.entries(sedeMap).sort((a, b) => b[1] - a[1])[0];
    const topSede = topSedeEntry ? topSedeEntry[0] : 'N/A';

    // Modelo Top
    const modelMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.modeloName || 'Desconocida';
      modelMap[name] = (modelMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const topModelEntry = Object.entries(modelMap).sort((a, b) => b[1] - a[1])[0];
    const topModel = topModelEntry ? topModelEntry[0] : 'N/A';

    // Datos para Gráfico de Barras (Tokens por Plataforma)
    const platformDataMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.plataformaName || 'Otros';
      platformDataMap[name] = (platformDataMap[name] || 0) + (Number(l.totalTokens) || 0);
    });
    const platformData = Object.entries(platformDataMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Datos para Gráfico de Torta (Tokens por Sede)
    const sedeData = Object.entries(sedeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalTokens, totalHours, efficiency, topSede, topModel, platformData, sedeData };
  }, [filteredLogs]);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#fb923c', '#facc15', '#22c55e'];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Indicadores de Gestión</h2>
          <p className="text-slate-400">Panel de control de rendimiento de ValkiriaStudio.</p>
        </div>
        
        {/* Filtro de Fecha */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-indigo-400" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <ArrowRight size={14} className="text-slate-500" />
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Tokens" value={stats.totalTokens.toLocaleString()} subtitle="Acumulado periodo" icon={TrendingUp} color="emerald" />
        <KPICard title="Eficiencia Promedio" value={`${stats.efficiency}`} subtitle="Tokens por Hora" icon={Zap} color="indigo" />
        <KPICard title="Sede Líder" value={stats.topSede} subtitle="Mayor producción" icon={Target} color="rose" />
        <KPICard title="Modelo Estrella" value={stats.topModel} subtitle="Rendimiento Top" icon={Users} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Barras */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Tokens por Plataforma</h3>
          <div className="h-80">
            {stats.platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
                <RefreshCw size={24} className="mb-2 opacity-20" />
                Sin datos para este rango
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Torta */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Distribución de Tokens por Sede</h3>
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
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.sedeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 p-4 min-w-[150px] bg-slate-900/30 rounded-lg">
                  {stats.sedeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{entry.name}</span>
                      <span className="text-[10px] font-bold text-slate-200 ml-auto">{entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
                <RefreshCw size={24} className="mb-2 opacity-20" />
                No hay actividad registrada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  return (
    <div className={`p-6 rounded-xl border ${colorMap[color]} shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800/80`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
          <h4 className="text-2xl font-black text-white mb-1 truncate">{value}</h4>
          <p className="text-slate-500 text-[10px] font-medium">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color].split(' ')[0]} border shadow-inner`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};
