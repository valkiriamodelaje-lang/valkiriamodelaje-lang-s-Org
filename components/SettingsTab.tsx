
import React, { useState } from 'react';
import { Configuration, Sede } from '../types';
import { Plus, X, Landmark, User, Globe, AlertCircle, ChevronRight, Cloud } from 'lucide-react';

interface SettingsTabProps {
  config: Configuration;
  supabase: any;
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ config, supabase, onRefresh }) => {
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  const [newSedeName, setNewSedeName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [syncing, setSyncing] = useState(false);

  const addSede = async () => {
    if (!newSedeName.trim()) return;
    setSyncing(true);
    const { data, error } = await supabase
      .from('sedes')
      .insert([{ name: newSedeName.trim() }])
      .select();
    
    if (error) alert(error.message);
    else {
      setNewSedeName('');
      onRefresh();
      if (data) setSelectedSedeId(data[0].id);
    }
    setSyncing(false);
  };

  const removeSede = async (id: string) => {
    if (!confirm('¿Borrar esta sede? Se perderán todas las relaciones en la nube.')) return;
    setSyncing(true);
    const { error } = await supabase.from('sedes').delete().eq('id', id);
    if (error) alert(error.message);
    else {
      if (selectedSedeId === id) setSelectedSedeId('');
      onRefresh();
    }
    setSyncing(false);
  };

  const addItemToSede = async (table: 'modelos' | 'plataformas') => {
    if (!newItemName.trim() || !selectedSedeId) return;
    setSyncing(true);
    const { error } = await supabase
      .from(table)
      .insert([{ name: newItemName.trim(), sede_id: selectedSedeId }]);
    
    if (error) alert(error.message);
    else {
      setNewItemName('');
      onRefresh();
    }
    setSyncing(false);
  };

  const removeItem = async (table: 'modelos' | 'plataformas', id: string) => {
    setSyncing(true);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message);
    else onRefresh();
    setSyncing(false);
  };

  const selectedSede = config.sedes.find(s => s.id === selectedSedeId);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Configuración en la Nube</h2>
          <p className="text-slate-400">Datos sincronizados con Supabase en tiempo real.</p>
        </div>
        {syncing && (
          <div className="flex items-center gap-2 text-indigo-400 animate-pulse text-sm font-bold">
            <Cloud size={16} />
            SINCRONIZANDO...
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna 1: Gestión de Sedes */}
        <div className="lg:col-span-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-2">
            <Landmark className="text-indigo-400" size={20} />
            <h3 className="font-bold text-white">1. Sedes</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              type="text"
              value={newSedeName}
              onChange={e => setNewSedeName(e.target.value)}
              placeholder="Nueva Sede..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button onClick={addSede} disabled={syncing} className="bg-indigo-600 p-2 rounded-lg text-white disabled:opacity-50"><Plus size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {config.sedes.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSedeId(s.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selectedSedeId === s.id 
                    ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="text-sm font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  <X size={14} className="hover:text-rose-400" onClick={(e) => { e.stopPropagation(); removeSede(s.id); }} />
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Columna 2: Gestión de Contenido Relacional */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedSede ? (
            <div className="h-full flex flex-col items-center justify-center bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-12 text-center">
              <AlertCircle size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-500">Selecciona una sede para gestionar sus recursos vinculados.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-xl">
                <h4 className="text-white font-bold flex items-center gap-2">
                  Configurando Sede: <span className="text-indigo-400 underline">{selectedSede.name}</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SubConfigSection 
                  title="Modelos"
                  icon={User}
                  items={config.modelos.filter(m => m.sedeId === selectedSedeId)}
                  placeholder="Nombre de Modelo..."
                  onAdd={(name: string) => { setNewItemName(name); addItemToSede('modelos'); }}
                  onRemove={(id: string) => removeItem('modelos', id)}
                  disabled={syncing}
                />

                <SubConfigSection 
                  title="Plataformas"
                  icon={Globe}
                  items={config.plataformas.filter(p => p.sedeId === selectedSedeId)}
                  placeholder="Ej: Chaturbate..."
                  onAdd={(name: string) => { setNewItemName(name); addItemToSede('plataformas'); }}
                  onRemove={(id: string) => removeItem('plataformas', id)}
                  disabled={syncing}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SubConfigSection = ({ title, icon: Icon, items, placeholder, onAdd, onRemove, disabled }: any) => {
  const [val, setVal] = useState('');
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[450px]">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-2">
        <Icon size={18} className="text-indigo-400" />
        <h4 className="font-bold text-white text-sm">{title} vinculados</h4>
      </div>
      <div className="p-3 flex gap-2">
        <input 
          type="text" 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          placeholder={placeholder}
          className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 text-xs outline-none" 
        />
        <button 
          disabled={disabled}
          onClick={() => { onAdd(val); setVal(''); }} 
          className="bg-slate-700 p-2 rounded text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.map((it: any) => (
          <div key={it.id} className="flex items-center justify-between bg-slate-900/30 p-2 rounded border border-slate-700/50 text-xs text-slate-300">
            {it.name}
            <X size={14} className="cursor-pointer hover:text-rose-400" onClick={() => onRemove(it.id)} />
          </div>
        ))}
      </div>
    </div>
  );
};
