
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertCircle, Terminal } from 'lucide-react';

// Variables de entorno siguiendo el estándar VITE (obligatorio prefijo VITE_)
// Se accede vía import.meta.env para compatibilidad total con el bundler de Vercel/Vite
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Inicialización única del cliente
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
      // Carga de maestros (Sedes, Modelos, Plataformas)
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

      // Carga de registros de asistencia con relaciones (Joins)
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
    else fetchData(); // Refresca los datos inmediatamente después de guardar
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
            Faltan las variables <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> en Vercel.
          </p>
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-left">
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Instrucciones</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. Ve a Vercel Settings > Environment Variables.<br/>
              2. Agrega las variables con el prefijo <strong>VITE_</strong>.<br/>
              3. Haz un nuevo "Redeploy" para aplicar los cambios.
            </p>
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
          <p className="text-slate-500 text-sm animate-pulse font-medium">Sincronizando ValkiriaCloud...</p>
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
