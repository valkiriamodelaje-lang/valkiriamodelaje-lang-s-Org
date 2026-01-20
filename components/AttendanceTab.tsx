
import React, { useState, useMemo } from 'react';
import { AttendanceLog, Configuration, Sede, Modelo, Plataforma } from '../types';
import { PlusCircle, Trash2, Clock, Landmark, User, Globe, Filter, Download, Calendar } from 'lucide-react';

interface AttendanceTabProps {
  logs: AttendanceLog[];
  config: Configuration;
  onAddLog: (log: AttendanceLog) => void;
  onDeleteLog: (id: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ logs, config, onAddLog, onDeleteLog }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sedeId: '',
    modeloId: '',
    plataformaId: '',
    horasConexion: '',
    totalTokens: ''
  });

  const [tableFilters, setTableFilters] = useState({
    date: '',
    sedeId: '',
    modeloId: '',
    plataformaId: ''
  });

  // Filter options based on selected Sede in FORM
  const availableModelos = useMemo(() => 
    config.modelos.filter(m => m.sedeId === formData.sedeId), 
  [config.modelos, formData.sedeId]);

  const availablePlataformas = useMemo(() => 
    config.plataformas.filter(p => p.sedeId === formData.sedeId), 
  [config.plataformas, formData.sedeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { date, sedeId, modeloId, plataformaId, horasConexion, totalTokens } = formData;
    
    if (!date || !sedeId || !modeloId || !plataformaId) {
      alert('Por favor complete todos los campos obligatorios, incluyendo la fecha.');
      return;
    }

    const sede = config.sedes.find(s => s.id === sedeId);
    const modelo = config.modelos.find(m => m.id === modeloId);
    const plataforma = config.plataformas.find(p => p.id === plataformaId);

    const newLog: AttendanceLog = {
      id: crypto.randomUUID(),
      date: date, // Usamos la fecha seleccionada en el input
      sedeId,
      sedeName: sede?.name || '',
      modeloId,
      modeloName: modelo?.name || '',
      plataformaId,
      plataformaName: plataforma?.name || '',
      horasConexion: parseFloat(horasConexion) || 0,
      totalTokens: parseInt(totalTokens) || 0
    };

    onAddLog(newLog);
    // Reiniciamos pero mantenemos la fecha para que sea más fácil cargar varios registros seguidos del mismo día
    setFormData({ ...formData, sedeId: '', modeloId: '', plataformaId: '', horasConexion: '', totalTokens: '' });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.date).toISOString().split('T')[0];
      return (
        (tableFilters.date === '' || logDate === tableFilters.date) &&
        (tableFilters.sedeId === '' || log.sedeId === tableFilters.sedeId) &&
        (tableFilters.modeloId === '' || log.modeloId === tableFilters.modeloId) &&
        (tableFilters.plataformaId === '' || log.plataformaId === tableFilters.plataformaId)
      );
    });
  }, [logs, tableFilters]);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Fecha', 'Sede', 'Modelo', 'Plataforma', 'Horas', 'Tokens'];
    const rows = filteredLogs.map(log => [
      new Date(log.date).toLocaleDateString(),
      log.sedeName,
      log.modeloName,
      log.plataformaName,
      log.horasConexion,
      log.totalTokens
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia_valkiria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Planilla de Asistencia</h2>
          <p className="text-slate-400">Registra las sesiones. Ahora puedes elegir la fecha de trabajo.</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium">
          <Download size={16} /> Exportar CSV
        </button>
      </header>

      {/* Form with Relational Filtering */}
      <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <PlusCircle className="text-indigo-400" size={20} /> Nuevo Registro
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={12} /> Fecha</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Landmark size={12} /> Sede</label>
            <select
              value={formData.sedeId}
              onChange={(e) => setFormData({ ...formData, sedeId: e.target.value, modeloId: '', plataformaId: '' })}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Sede...</option>
              {config.sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><User size={12} /> Modelo</label>
            <select
              value={formData.modeloId}
              disabled={!formData.sedeId}
              onChange={(e) => setFormData({ ...formData, modeloId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{formData.sedeId ? 'Modelo...' : 'Elija Sede'}</option>
              {availableModelos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Globe size={12} /> Plataforma</label>
            <select
              value={formData.plataformaId}
              disabled={!formData.sedeId}
              onChange={(e) => setFormData({ ...formData, plataformaId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{formData.sedeId ? 'Plataforma...' : 'Elija Sede'}</option>
              {availablePlataformas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={12} /> Horas</label>
            <input type="number" step="0.1" value={formData.horasConexion} onChange={(e) => setFormData({ ...formData, horasConexion: e.target.value })} placeholder="0.0" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">Tokens</label>
            <input type="number" value={formData.totalTokens} onChange={(e) => setFormData({ ...formData, totalTokens: e.target.value })} placeholder="0" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="md:col-span-3 lg:col-span-6 flex justify-end pt-2">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-lg font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-95">Guardar Registro</button>
          </div>
        </form>
      </section>

      {/* Table with Column Filters */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-2"><Filter size={20} className="text-indigo-400" /><h3 className="text-lg font-semibold text-white">Historial Filtrable</h3></div>
          <span className="text-slate-400 text-sm font-medium">Viendo {filteredLogs.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">
                  Fecha
                  <input type="date" value={tableFilters.date} onChange={e => setTableFilters({...tableFilters, date: e.target.value})} className="block mt-2 w-full bg-slate-800 border-slate-700 rounded text-[10px] p-1" />
                </th>
                <th className="px-6 py-4">
                  Sede
                  <select value={tableFilters.sedeId} onChange={e => setTableFilters({...tableFilters, sedeId: e.target.value})} className="block mt-2 w-full bg-slate-800 border-slate-700 rounded text-[10px] p-1">
                    <option value="">Todas</option>
                    {config.sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </th>
                <th className="px-6 py-4">
                  Modelo
                  <select value={tableFilters.modeloId} onChange={e => setTableFilters({...tableFilters, modeloId: e.target.value})} className="block mt-2 w-full bg-slate-800 border-slate-700 rounded text-[10px] p-1">
                    <option value="">Todos</option>
                    {config.modelos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </th>
                <th className="px-6 py-4">
                  Plataforma
                  <select value={tableFilters.plataformaId} onChange={e => setTableFilters({...tableFilters, plataformaId: e.target.value})} className="block mt-2 w-full bg-slate-800 border-slate-700 rounded text-[10px] p-1">
                    <option value="">Todas</option>
                    {config.plataformas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </th>
                <th className="px-6 py-4">Horas</th>
                <th className="px-6 py-4">Tokens</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{log.sedeName}</td>
                  <td className="px-6 py-4 text-sm text-indigo-300">{log.modeloName}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.plataformaName}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">{log.horasConexion}h</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-400">{log.totalTokens}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => onDeleteLog(log.id)} className="text-rose-400 hover:text-rose-300 p-2 transition-colors"><Trash2 size={16} /></button></td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic text-sm">No hay registros que coincidan con los filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
