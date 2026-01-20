
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertCircle, Terminal, Database, ShieldCheck, RefreshCcw } from 'lucide-react';

// Intentar capturar las variables de entorno de forma segura para Vite/Vercel
const VITE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const VITE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<Configuration>({ sedes: [], modelos: [], plataformas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para credenciales (inicializa con las de Vite si existen)
  const [creds, setCreds] = useState({
    url: VITE_URL,
    key: VITE_KEY
  });

  // Cliente de Supabase: Si existen variables de entorno, se crea automáticamente
  const [supabase, setSupabase] = useState<SupabaseClient | null>(() => {
    if (VITE_URL && VITE_KEY) {
      return createClient(VITE_URL, VITE_KEY);
    }
    return null;
  });

  const fetchData = useCallback(async (client: SupabaseClient) => {
    setLoading(true);
    setError(null);
    try {
      const [rSedes, rModelos, rPlataformas] = await Promise.all([
        client.from('sedes').select('*').order('name'),
        client.from('modelos').select('*').order('name'),
        client.from('plataformas').select('*').order('name')
      ]);

      if (rSedes.error) throw rSedes.error;

      setConfig({
        sedes: (rSedes.data as Sede[]) || [],
        modelos: (rModelos.data || []).map((m: any) => ({ 
          id: m.id, name: m.name, sedeId: m.sede_id 
        })),
        plataformas: (rPlataformas.data || []).map((p: any) => ({ 
          id: p.id, name: p.name, sedeId: p.sede_id 
        }))
      });

      const { data: logsData, error: logsError } = await client
        .from('attendance_logs')
        .select('*, sedes(name), modelos(name), plataformas(name)')
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      if (logsData) {
        setLogs(logsData.map(l => ({
          id: l.id,
          date: l.date,
          sedeId: l.sede_id,
          sedeName: l.sedes?.name || 'N/A',
          modeloId: l.modelo_id,
          modeloName: l.modelos?.name || 'N/A',
          plataformaId: l.plataforma_id,
          plataformaName: l.plataformas?.name || 'N/A',
          horasConexion: Number(l.horas_conexion) || 0,
          totalTokens: Number(l.total_tokens) || 0
        })));
      }
    } catch (err: any) {
      console.error("Supabase Fetch Error:", err);
      setError(err.message || 'Error de conexión con la base de datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchData(supabase);
    } else {
      setLoading(false);
    }
  }, [supabase, fetchData]);

  const handleManualConnect = () => {
    if (creds.url && creds.key) {
      try {
        const client = createClient(creds.url, creds.key);
        setSupabase(client);
        setError(null);
      } catch (e: any) {
        setError("URL o Key inválida");
      }
    }
  };

  const addLog = async (logData: AttendanceLog) => {
    if (!supabase) return;
    const { error: insertError } = await supabase
      .from('attendance_logs')
      .insert([{
        sede_id: logData.sedeId,
        modelo_id: logData.modeloId,
        plataforma_id: logData.plataformaId,
        horas_conexion: logData.horasConexion,
        total_tokens: logData.totalTokens,
        date: logData.date // Ahora usa la fecha del formulario
      }]);
    
    if (insertError) alert("Error al guardar: " + insertError.message);
    else fetchData(supabase);
  };

  const deleteLog = async (id: string) => {
    if (!supabase || !confirm('¿Eliminar este registro?')) return;
    const { error: deleteError } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (deleteError) alert("Error al borrar: " + deleteError.message);
    else fetchData(supabase);
  };

  if (!supabase && !VITE_URL) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="bg-indigo-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <Database className="text-indigo-400" size={32} />
            </div>
            <h1 className="text-2xl font-black mb-2 tracking-tight">ValkiriaStudio Cloud</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              En Vercel la conexión es automática. En este preview, por favor pega tus datos de Supabase para validar los indicadores.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Supabase URL</label>
              <input 
                type="text" 
                placeholder="https://your-project.supabase.co"
                value={creds.url}
                onChange={e => setCreds({...creds, url: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Anon Key</label>
              <input 
                type="password" 
                placeholder="Pega tu clave pública aquí..."
                value={creds.key}
                onChange={e => setCreds({...creds, key: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            onClick={handleManualConnect}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <ShieldCheck size={20} />
            Validar Conexión en Preview
          </button>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-500 text-sm animate-pulse font-medium">Sincronizando ValkiriaCloud...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => supabase && fetchData(supabase)} className="text-xs underline hover:text-white">Reintentar</button>
          </div>
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab 
            logs={logs} 
            config={config} 
            onAddLog={addLog} 
            onDeleteLog={deleteLog} 
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab logs={logs} config={config} />}
        {activeTab === 'settings' && (
          <SettingsTab 
            config={config} 
            supabase={supabase}
            onRefresh={() => supabase && fetchData(supabase)}
          />
        )}
      </div>
    </Layout>
  );
}
