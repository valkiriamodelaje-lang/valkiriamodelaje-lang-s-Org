
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AttendanceTab } from './components/AttendanceTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { AttendanceLog, Configuration, TabType, Sede, Modelo, Plataforma } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, CloudOff } from 'lucide-react';

// Safely get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Initialize client only if variables exist to prevent "supabaseUrl is required" error
const supabase: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [config, setConfig] = useState<Configuration>({ sedes: [], modelos: [], plataformas: [] });
  const [loading, setLoading] = useState(true);

  // Initial Data Load from Supabase
  const fetchData = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    try {
      const { data: sedes } = await supabase.from('sedes').select('*');
      const { data: modelos } = await supabase.from('modelos').select('*');
      const { data: plataformas } = await supabase.from('plataformas').select('*');
      
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
        modelos: (modelos as any[]).map(m => ({ id: m.id, name: m.name, sedeId: m.sede_id })) || [],
        plataformas: (plataformas as any[]).map(p => ({ id: p.id, name: p.name, sedeId: p.sede_id })) || []
      });

      if (logsData) {
        const mappedLogs: AttendanceLog[] = logsData.map(l => ({
          id: l.id,
          date: l.date,
          sedeId: l.sede_id,
          sedeName: l.sedes?.name || 'N/A',
          modeloId: l.modelo_id,
          modeloName: l.modelos?.name || 'N/A',
          plataformaId: l.plataforma_id,
          plataformaName: l.plataformas?.name || 'N/A',
          horasConexion: l.horas_conexion,
          totalTokens: l.total_tokens
        }));
        setLogs(mappedLogs);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
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
      }])
      .select();
    
    if (error) alert("Error guardando en la nube: " + error.message);
    else fetchData();
  };

  const deleteLog = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('attendance_logs').delete().eq('id', id);
    if (error) alert("Error borrando: " + error.message);
    else fetchData();
  };

  // Screen to show if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-amber-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Configuración Requerida</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            No se detectaron las variables de entorno de <strong>Supabase</strong>. 
            Para continuar, asegúrate de configurar <code className="bg-slate-900 px-2 py-1 rounded text-indigo-400 text-sm">SUPABASE_URL</code> y <code className="bg-slate-900 px-2 py-1 rounded text-indigo-400 text-sm">SUPABASE_ANON_KEY</code>.
          </p>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-left mb-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pasos a seguir:</h2>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>Crea un proyecto en <a href="https://supabase.com" target="_blank" className="text-indigo-400 hover:underline">Supabase</a></li>
              <li>Crea las tablas usando el SQL proporcionado</li>
              <li>Agrega las variables en tu proveedor de hosting (Vercel)</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
          >
            Reintentar Conexión
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
          <p className="text-slate-400 font-medium">Sincronizando Valkiria Cloud...</p>
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
