
import React from 'react';
import { TabType } from '../types';
import { ClipboardList, BarChart3, Settings, Crown } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'attendance', label: 'Asistencia', icon: ClipboardList },
    { id: 'analytics', label: 'Indicadores', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar / Mobile Nav */}
      <aside className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Crown className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ValkiriaStudio</h1>
        </div>

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center uppercase tracking-widest font-bold">
            v1.0.0 Alpha
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900">
        {children}
      </main>
    </div>
  );
};
