
export interface Sede {
  id: string;
  name: string;
}

export interface Modelo {
  id: string;
  name: string;
  sedeId: string;
}

export interface Plataforma {
  id: string;
  name: string;
  sedeId: string;
}

export interface AttendanceLog {
  id: string;
  date: string;
  sedeId: string;
  sedeName: string;
  modeloId: string;
  modeloName: string;
  plataformaId: string;
  plataformaName: string;
  horasConexion: number;
  totalTokens: number;
}

export interface Configuration {
  sedes: Sede[];
  modelos: Modelo[];
  plataformas: Plataforma[];
}

export type TabType = 'attendance' | 'analytics' | 'settings';
