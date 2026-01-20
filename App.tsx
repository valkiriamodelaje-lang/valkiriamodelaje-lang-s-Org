
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertCircle, Terminal } from 'lucide-react';

/**
 * Obtiene variables de entorno de forma segura evitando errores de 'undefined'
 * mediante el uso de encadenamiento opcional (optional chaining).
 * Busca en import.meta.env (Vite) y process.env (Vercel/Node) con y sin prefijo VITE_.
 */
const SUPABASE_URL = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (import.meta as any).env?.SUPABASE_URL || 
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_URL : '') ||
  (typeof process !== 'undefined' ? (process as any).env?.SUPABASE_URL : '') ||
  '';

const SUPABASE_ANON_KEY = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env?.SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_ANON_KEY : '') ||
  (typeof process !== 'undefined' ? (process as any).env?.SUPABASE_ANON_KEY : '') ||
  '';

// Inicialización única del cliente de Supabase
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
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [rSedes, rModelos, rPlataformas] = await Promise.all([
        supabase.from('sedes').select('*').order('name'),
        supabase.from('modelos').select('*').order('name'),
        supabase.from('plataformas').select('*').order('name')
      ]);

      if (rSedes.error) throw rSedes.error;

      const newConfig: Configuration = {
        sedes: (rSedes.data as Sede[]) || [],
        modelos: (rModelos.data || []).map((m: any) => ({ 
          id: m.id, 
          name: m.name, 
          sedeId: m.sede_id 
        })),
        plataformas: (rPlataformas.data || []).map((p: any) => ({ 
          id: p.id, 
          name: p.name, 
          sedeId: p.sede_id 
        }))
      };
      setConfig(newConfig);

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
      console.error("Error en fetchData:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addLog = async (logData: any) => {
    if (!supabase) return;
    const { error: insertError } = await supabase
      .from('attendance_logs')
      .insert([{
        sede_id: logData.sedeId,
        modelo_id: logData.modeloId,
        plataforma_id: logData.plataformaId,
        horas_conexion: logData.horasConexion,
        total_tokens: logData.totalTokens,
        date: new Date().toISOString()
      }]);
    
    if (insertError) alert("Error al guardar: " + insertError.message);
    else fetchData();
  };

  const deleteLog = async (id: string) => {
    if (!supabase || !confirm('¿Eliminar este registro?')) return;
    const { error: deleteError } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (deleteError) alert("Error al borrar: " + deleteError.message);
    else fetchData();
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <AlertCircle className="text-amber-500 mx-auto mb-4" size={56} />
          <h1 className="text-2xl font-bold mb-4">Configuración Pendiente</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Para que <strong>ValkiriaStudio</strong> funcione correctamente en producción, debes configurar las variables de entorno.
          </p>
          
          <div className="space-y-4 text-left">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Terminal size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Variables en Vercel</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 font-mono">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0 && config.sedes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-500 text-sm animate-pulse">Sincronizando ValkiriaCloud...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            Error de conexión: {error}
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
            onRefresh={fetchData}
          />
        )}
      </div>
    </Layout>
  );
}
