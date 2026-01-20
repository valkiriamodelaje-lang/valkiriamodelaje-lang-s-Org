
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, Database } from 'lucide-react';

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key] || '';
    }
  } catch (e) {}
  return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

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
        console.error("Error cargando configuración:", e1 || e2 || e3);
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

  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Variables de Entorno Faltantes</h1>
          <p className="text-slate-400 mb-6 text-sm">Asegúrate de configurar SUPABASE_URL y SUPABASE_ANON_KEY en el panel de Vercel.</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 py-3 rounded-xl text-white font-bold">Reintentar</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/50 rounded-2xl p-8 text-center shadow-2xl">
          <Database className="text-rose-500 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Error de Base de Datos</h1>
          <p className="text-rose-400 mb-6 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>
          <p className="text-slate-400 text-xs mb-6">Verifica que las tablas existan y que las políticas de RLS permitan lectura pública.</p>
          <button onClick={fetchData} className="w-full bg-slate-700 py-3 rounded-xl text-white font-bold">Reintentar Carga</button>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-400 font-medium">Sincronizando con Valkiria Cloud...</p>
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
