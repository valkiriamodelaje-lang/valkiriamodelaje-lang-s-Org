
import React, { useState } from 'react';
import { Configuration } from '../types';
import { Plus, X, Landmark, User, Globe, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

interface SettingsTabProps {
  config: Configuration;
  supabase: SupabaseClient | null;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ config, supabase, onRefresh }) => {
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  const [newSedeName, setNewSedeName] = useState('');

  const addSede = async () => {
    if (!newSedeName.trim() || !supabase) return;
    const { error } = await supabase.from('sedes').insert([{ name: newSedeName.trim() }]);
    if (error) alert(error.message);
    else {
      setNewSedeName('');
      onRefresh();
    }
  };

  const removeSede = async (id: string) => {
    if (!confirm('¿Eliminar sede? Esto borrará modelos y plataformas asociados.') || !supabase) return;
    const { error } = await supabase.from('sedes').delete().eq('id', id);
    if (error) alert("No se pudo eliminar la sede: " + error.message);
    else {
      if (selectedSedeId === id) setSelectedSedeId('');
      onRefresh();
    }
  };

  const addItem = async (table: 'modelos' | 'plataformas', name: string) => {
    if (!name.trim() || !selectedSedeId || !supabase) return;
    const { error } = await supabase.from(table).insert([{ 
      name: name.trim(), 
      sede_id: selectedSedeId 
    }]);
    if (error) alert(error.message);
    else onRefresh();
  };

  const removeItem = async (table: 'modelos' | 'plataformas', id: string) => {
    if (!supabase) return;
    const itemType = table === 'modelos' ? 'el modelo' : 'la plataforma';
    if (!confirm(`¿Estás seguro de que deseas eliminar ${itemType}?`)) return;

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      alert(`No se pudo eliminar: El recurso podría estar vinculado a registros de asistencia existentes.`);
      console.error(error);
    } else {
      onRefresh();
    }
  };

  const selectedSede = config.sedes.find(s => s.id === selectedSedeId);

  if (!supabase) return <div className="text-white p-8 text-center bg-slate-800 rounded-xl border border-slate-700">Error: No hay conexión a la base de datos configurada.</div>;

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-bold text-white">Configuración del Estudio</h2>
        <p className="text-slate-400">Personaliza tus sedes, modelos y sitios de trabajo de forma independiente.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel de Sedes */}
        <div className="lg:col-span-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-2">
            <Landmark className="text-indigo-400" size={20} />
            <h3 className="font-bold text-white">Sedes</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              type="text"
              value={newSedeName}
              onChange={e => setNewSedeName(e.target.value)}
              placeholder="Nueva Sede..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button onClick={addSede} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg text-white transition-colors">
              <Plus size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {config.sedes.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSedeId(s.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selectedSedeId === s.id 
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' 
                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="text-sm font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="p-1 hover:text-rose-400 text-slate-500 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); removeSede(s.id); }}
                  >
                    <Trash2 size={14} />
                  </div>
                  <ChevronRight size={16} className={selectedSedeId === s.id ? 'text-indigo-400' : 'text-slate-600'} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Panel de Recursos Detallados */}
        <div className="lg:col-span-8">
          {!selectedSede ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-12 text-center">
              <AlertCircle size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-500 italic">Selecciona una sede en el panel izquierdo para gestionar sus modelos y plataformas.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-white font-bold text-xl mb-1">{selectedSede.name}</h4>
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Gestión de Variables Locales</p>
                </div>
                <div className="bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700 text-[10px] text-slate-400 font-mono">
                  ID: {selectedSede.id.split('-')[0]}...
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResourcePanel 
                  title="Modelos" 
                  icon={User} 
                  items={config.modelos.filter(m => m.sedeId === selectedSedeId)}
                  onAdd={(name: string) => addItem('modelos', name)}
                  onRemove={(id: string) => removeItem('modelos', id)}
                />
                <ResourcePanel 
                  title="Plataformas" 
                  icon={Globe} 
                  items={config.plataformas.filter(p => p.sedeId === selectedSedeId)}
                  onAdd={(name: string) => addItem('plataformas', name)}
                  onRemove={(id: string) => removeItem('plataformas', id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ResourcePanelProps {
  title: string;
  icon: any;
  items: any[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ title, icon: Icon, items, onAdd, onRemove }) => {
  const [val, setVal] = useState('');
  
  const handleAdd = () => {
    if (val.trim()) {
      onAdd(val);
      setVal('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex flex-col h-[400px] overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-2 bg-slate-800/50">
        <Icon size={18} className="text-indigo-400" />
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <span className="ml-auto bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold">{items.length}</span>
      </div>
      
      <div className="p-3 flex gap-2 bg-slate-900/20">
        <input 
          type="text" 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Nuevo ${title.toLowerCase()}...`}
          className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600" 
        />
        <button 
          onClick={handleAdd} 
          disabled={!val.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 p-2 rounded text-white transition-all shadow-lg active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {items.map((it: any) => (
          <div 
            key={it.id} 
            className="flex items-center justify-between bg-slate-900/40 p-3 rounded border border-slate-700/50 text-xs text-slate-300 group hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all"
          >
            <span className="truncate pr-2 font-medium">{it.name}</span>
            <button 
              onClick={() => onRemove(it.id)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-all"
              title={`Eliminar ${title}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic">
            No hay {title.toLowerCase()} registrados.
          </div>
        )}
      </div>
    </div>
  );
};
