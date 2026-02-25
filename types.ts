export enum AppView {
  LANDING = 'LANDING', // Now acts as Login View
  LISTENER_HOME = 'LISTENER_HOME',
  WORKER_HOME = 'WORKER_HOME',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  APP_USER_MANAGEMENT = 'APP_USER_MANAGEMENT',
  
  // CMNL Apps
  APP_AGENDA = 'APP_AGENDA',
  APP_MUSICA = 'APP_MUSICA',
  APP_GUIONES = 'APP_GUIONES',
  APP_PROGRAMACION = 'APP_PROGRAMACION',

  // Sections
  SECTION_HISTORY = 'SECTION_HISTORY',
  SECTION_PROGRAMMING_PUBLIC = 'SECTION_PROGRAMMING_PUBLIC',
  SECTION_ABOUT = 'SECTION_ABOUT',
  SECTION_NEWS = 'SECTION_NEWS',
  SECTION_NEWS_DETAIL = 'SECTION_NEWS_DETAIL', // New view for reading news
  SECTION_PODCAST = 'SECTION_PODCAST',
  SECTION_PROFILE = 'SECTION_PROFILE',
}

export type UserClassification = 'Director' | 'Asesor' | 'Realizador de sonido' | 'Locutor' | 'Administrador' | 'Usuario';

export interface User {
  username: string;
  role: 'admin' | 'worker' | 'listener';
  name: string;
  classification?: UserClassification;
  avatar?: string;
  mobile?: string;
  password?: string;
}

export interface ProgramSchedule {
  name: string;
  start: string;
  end: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface ProgramSection {
  name: string;
  schedule: string;
  duration: string;
  description: string;
}

export interface RolePaymentInfo {
  role: string;
  percentage: string;
  tr: string;
  salaries: { level: string; amount: string }[];
  rates: { level: string; amount: string }[];
}

export interface ProgramCatalog {
  name: string;
  roles: RolePaymentInfo[];
}

export interface Script {
  id: string;
  title: string;
  genre: string;
  dateAdded: string;
  writer: string;
  advisor: string;
  themes: string[];
  content?: string;
}

export interface ProgramFicha {
  name: string;
  schedule: string;
  duration: string;
  frequency: string;
  func: string;
  music_cuban: string;
  music_foreign: string;
  group: string;
  form: string;
  complexity: string;
  theme: string;
  target: string;
  times: {
    music: string;
    info: string;
    propaganda: string;
  };
  startDate: string;
  emissionType: string;
  literarySupport: string;
  objective: string;
  profile: string;
  sections: ProgramSection[];
}