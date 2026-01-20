
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, Database, ShieldCheck } from 'lucide-react';

// IMPORTANTE: Acceso directo y literal para Vercel
// @ts-ignore
const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || '';
// @ts-ignore
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || '';

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
      // 1. Cargar configuración base
      const [rSedes, rModelos, rPlataformas] = await Promise.all([
        supabase.from('sedes').select('*'),
        supabase.from('modelos').select('*'),
        supabase.from('plataformas').select('*')
      ]);

      if (rSedes.error) throw rSedes.error;

      // Mapeo seguro de campos DB (snake_case) a App (camelCase)
      const newConfig: Configuration = {
        sedes: (rSedes.data as Sede[]) || [],
        modelos: (rModelos.data || []).map((m: any) => ({ 
          id: m.id, 
          name: m.name, 
          sedeId: m.sede_id || m.sedeId 
        })),
        plataformas: (rPlataformas.data || []).map((p: any) => ({ 
          id: p.id, 
          name: p.name, 
          sedeId: p.sede_id || p.sedeId 
        }))
      };
      setConfig(newConfig);

      // 2. Cargar Logs con joins (si fallan las relaciones, cargamos lo básico)
      const { data: logsData, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          sedes(name),
          modelos(name),
          plataformas(name)
        `)
        .order('created_at', { ascending: false });

      if (logsError) {
        // Reintento sin joins si fallan las llaves foráneas
        const { data: simpleLogs } = await supabase.from('attendance_logs').select('*').order('created_at', { ascending: false });
        if (simpleLogs) {
          setLogs(simpleLogs.map(l => ({
            id: l.id,
            date: l.date || l.created_at,
            sedeId: l.sede_id,
            sedeName: newConfig.sedes.find(s => s.id === l.sede_id)?.name || 'N/A',
            modeloId: l.modelo_id,
            modeloName: newConfig.modelos.find(m => m.id === l.modelo_id)?.name || 'N/A',
            plataformaId: l.plataforma_id,
            plataformaName: newConfig.plataformas.find(p => p.id === l.plataforma_id)?.name || 'N/A',
            horasConexion: Number(l.horas_conexion) || 0,
            totalTokens: Number(l.total_tokens) || 0
          })));
        }
      } else if (logsData) {
        setLogs(logsData.map(l => ({
          id: l.id,
          date: l.date || l.created_at,
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
      console.error("Fetch error:", err);
      setError(err.message || "Error al sincronizar con Valkiria Cloud");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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
        total_tokens: newLogData.totalTokens,
        date: new Date().toISOString()
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

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex p-4 bg-amber-500/10 rounded-full mb-6">
            <AlertTriangle className="text-amber-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Variables No Detectadas</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Las claves de Supabase no han sido inyectadas en el cliente.
          </p>
          
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left border border-slate-700/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Diagnóstico:</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">SUPABASE_URL:</span>
                <span className={SUPABASE_URL ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {SUPABASE_URL ? "OK" : "FALTA"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">SUPABASE_ANON_KEY:</span>
                <span className={SUPABASE_ANON_KEY ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {SUPABASE_ANON_KEY ? "OK" : "FALTA"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-bold transition-all">Refrescar</button>
            <p className="text-[10px] text-slate-500 italic">
              * Importante: Ve a Vercel &gt; Deployments y haz "Redeploy" para aplicar los cambios de variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/50 rounded-2xl p-8">
          <Database className="text-rose-500 mx-auto mb-4" size={48} />
          <h1 className="text-xl font-bold text-white mb-2">Error de Sincronización</h1>
          <p className="text-rose-400 mb-6 text-xs bg-rose-500/10 p-4 rounded-lg">{error}</p>
          <button onClick={fetchData} className="w-full bg-indigo-600 py-3 rounded-xl text-white font-bold">Reintentar Conexión</button>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-500 text-sm font-medium">Sincronizando Valkiria Cloud...</p>
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
