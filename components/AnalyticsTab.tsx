
import React, { useMemo, useState } from 'react';
import { AttendanceLog, Configuration } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Target, Zap, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';

interface AnalyticsTabProps {
  logs: AttendanceLog[];
  config: Configuration;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ logs }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredLogs = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return logs.filter(l => {
      const logDate = new Date(l.date);
      return logDate >= start && logDate <= end;
    });
  }, [logs, startDate, endDate]);

  const stats = useMemo(() => {
    const totalTokens = filteredLogs.reduce((acc, l) => acc + Number(l.totalTokens), 0);
    const totalHours = filteredLogs.reduce((acc, l) => acc + Number(l.horasConexion), 0);
    const efficiency = totalHours > 0 ? (totalTokens / totalHours).toFixed(1) : "0";
    
    // Top Sede
    const sedeMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.sedeName || 'Desconocida';
      sedeMap[name] = (sedeMap[name] || 0) + Number(l.totalTokens);
    });
    const topSede = Object.entries(sedeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Top Model
    const modelMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.modeloName || 'Desconocida';
      modelMap[name] = (modelMap[name] || 0) + Number(l.totalTokens);
    });
    const topModel = Object.entries(modelMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Bar Chart Data (Tokens by Platform)
    const platformDataMap: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const name = l.plataformaName || 'Desconocida';
      platformDataMap[name] = (platformDataMap[name] || 0) + Number(l.totalTokens);
    });
    const platformData = Object.entries(platformDataMap).map(([name, value]) => ({ name, value }));

    // Pie Chart Data (Tokens by Sede)
    const sedeData = Object.entries(sedeMap).map(([name, value]) => ({ name, value }));

    return { totalTokens, totalHours, efficiency, topSede, topModel, platformData, sedeData };
  }, [filteredLogs]);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#fb923c', '#facc15'];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Indicadores de Gestión</h2>
          <p className="text-slate-400">Análisis detallado de rendimiento y eficiencia.</p>
        </div>
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
        <KPICard title="Total Tokens" value={stats.totalTokens.toLocaleString()} subtitle="En el periodo" icon={TrendingUp} color="emerald" />
        <KPICard title="Eficiencia" value={`${stats.efficiency}`} subtitle="Tokens / Hora" icon={Zap} color="indigo" />
        <KPICard title="Sede Líder" value={stats.topSede} subtitle="Máximo Generador" icon={Target} color="rose" />
        <KPICard title="Modelo Top" value={stats.topModel} subtitle="Mejor Desempeño" icon={Users} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Sin datos en este rango</div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Distribución por Sede</h3>
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
                <div className="flex flex-col gap-2 p-4 min-w-[150px]">
                  {stats.sedeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">{entry.name}</span>
                      <span className="text-xs font-bold text-slate-200 ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Sin datos en este rango</div>
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
    <div className={`p-6 rounded-xl border ${colorMap[color]} shadow-lg transition-transform hover:scale-[1.02]`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-white mb-1">{value}</h4>
          <p className="text-slate-500 text-xs">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color].split(' ')[0]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};
