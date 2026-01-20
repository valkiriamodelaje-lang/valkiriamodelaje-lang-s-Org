
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, Database, ShieldCheck } from 'lucide-react';

// IMPORTANTE: Acceso directo y literal para que los bundlers (Vite/Vercel) puedan inyectarlos
// No usar funciones envolventes ni corchetes [key]
// @ts-ignore
const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
// @ts-ignore
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

// Inicializar cliente solo si las variables existen físicamente
const supabase: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<Configuration>({ sedes: [], modelos: [], plataformas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data: sedes, error: e1 } = await supabase.from('sedes').select('*');
      const { data: modelos, error: e2 } = await supabase.from('modelos').select('*');
      const { data: plataformas, error: e3 } = await supabase.from('plataformas').select('*');
      
      if (e1 || e2 || e3) {
        console.error("Error en configuración:", e1 || e2 || e3);
      }

      const { data: logsData, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          sedes(name),
          modelos(name),
          plataformas(name)
        `)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      setConfig({
        sedes: (sedes as Sede[]) || [],
        modelos: (modelos || []).map((m: any) => ({ id: m.id, name: m.name, sedeId: m.sede_id })),
        plataformas: (plataformas || []).map((p: any) => ({ id: p.id, name: p.name, sedeId: p.sede_id }))
      });

      if (logsData) {
        const mappedLogs: AttendanceLog[] = logsData.map(l => ({
          id: l.id,
          date: l.date,
          sedeId: l.sede_id,
          sedeName: l.sedes?.name || 'Sede Eliminada',
          modeloId: l.modelo_id,
          modeloName: l.modelos?.name || 'Modelo Eliminado',
          plataformaId: l.plataforma_id,
          plataformaName: l.plataformas?.name || 'Plataforma Eliminada',
          horasConexion: Number(l.horas_conexion) || 0,
          totalTokens: Number(l.total_tokens) || 0
        }));
        setLogs(mappedLogs);
      }
    } catch (err: any) {
      console.error("Error general:", err);
      setError(err.message || "Error de conexión con Supabase");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  const addLog = async (newLogData: any) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('attendance_logs')
      .insert([{
        sede_id: newLogData.sedeId,
        modelo_id: newLogData.modeloId,
        plataforma_id: newLogData.plataformaId,
        horas_conexion: newLogData.horasConexion,
        total_tokens: newLogData.totalTokens
      }]);
    
    if (error) alert("Error al guardar: " + error.message);
    else fetchData();
  };

  const deleteLog = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (error) alert("Error al borrar: " + error.message);
    else fetchData();
  };

  // Pantalla de error si faltan variables (ahora con más info para debugear)
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex p-4 bg-amber-500/10 rounded-full mb-6">
            <AlertTriangle className="text-amber-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Variables No Detectadas</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Vercel no ha inyectado las claves de Supabase. Esto ocurre si no has realizado un <strong>Redeploy</strong> después de añadirlas.
          </p>
          
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left border border-slate-700/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Estado de claves:</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">SUPABASE_URL:</span>
                <span className={SUPABASE_URL ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {SUPABASE_URL ? "DETECTADA" : "FALTANTE"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">SUPABASE_ANON_KEY:</span>
                <span className={SUPABASE_ANON_KEY ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {SUPABASE_ANON_KEY ? "DETECTADA" : "FALTANTE"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-bold transition-all shadow-lg"
            >
              Refrescar Página
            </button>
            <p className="text-[10px] text-slate-500 italic">
              * Si las variables aparecen como "FALTANTE", ve a Vercel > Deployments y selecciona "Redeploy" en el último envío.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/50 rounded-2xl p-8 text-center shadow-2xl">
          <Database className="text-rose-500 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Error de Conexión</h1>
          <p className="text-rose-400 mb-6 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>
          <button onClick={fetchData} className="w-full bg-slate-700 py-3 rounded-xl text-white font-bold">Reintentar</button>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
            <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400/50" size={24} />
          </div>
          <p className="text-slate-400 font-medium tracking-wide">Autenticando Valkiria Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            onRefresh={fetchData}
          />
        )}
      </div>
    </Layout>
  );
}
