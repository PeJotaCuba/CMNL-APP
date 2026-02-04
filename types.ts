export enum AppView {
  LANDING = 'LANDING',
  LISTENER_HOME = 'LISTENER_HOME',
  WORKER_HOME = 'WORKER_HOME',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

export interface User {
  username: string;
  role: 'admin' | 'worker' | 'listener';
  name: string;
  avatar?: string;
}
