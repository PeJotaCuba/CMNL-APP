import { User, NewsItem } from '../types';

// Simulacion de archivo en carpeta Iconos - Logo sin el punto central
export const LOGO_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='white' rx='80' ry='80'/%3E%3Cpath d='M140,380 V200 A60,60 0 0,1 260,200 V380' fill='none' stroke='%233E1E16' stroke-width='65' stroke-linecap='round' /%3E%3Cpath d='M260,380 V160 A100,100 0 0,1 460,160 V380' fill='none' stroke='%238B5E3C' stroke-width='65' stroke-linecap='round' /%3E%3C/svg%3E";

export const INITIAL_USERS: User[] = [
  { name: 'Pedro José Reyes Acuña', username: 'admin', mobile: '54413935', password: 'RCMM26', role: 'admin', classification: 'Administrador' },
  { name: 'Lissell Fontelo Danta', username: 'lissell', mobile: '58841705', password: 'RadioCiudad0226', role: 'worker', classification: 'Director' },
  { name: 'Ernesto José Parra Muñoz', username: 'ernesto', mobile: '52137105', password: 'RadioCiudad0326', role: 'worker', classification: 'Realizador de sonido' },
  { name: 'Jorge Luis Rosales Sánchez', username: 'jorge', mobile: '55326426', password: 'RadioCiudad0426', role: 'worker', classification: 'Locutor' },
  { name: 'Susel López Jiménez', username: 'susel', mobile: '54778270', password: 'RadioCiudad0526', role: 'worker', classification: 'Asesor' },
  { name: 'Arnaldo Ernesto Torres García', username: 'arnaldo', mobile: '53924841', password: 'RadioCiudad0626', role: 'worker', classification: 'Usuario' },
  { name: 'Beatriz Ganado Arias', username: 'beatriz', mobile: '54777754', password: 'RadioCiudad0726', role: 'worker', classification: 'Usuario' },
  { name: 'Rosa Aracelis Chi Cedeño', username: 'rosa', mobile: '54275723', password: 'RadioCiudad0826', role: 'worker', classification: 'Usuario' },
  { name: 'Abel Girardo Guerrero Castro', username: 'abel', mobile: '59195045', password: 'RadioCiudad0926', role: 'worker', classification: 'Usuario' },
  { name: 'Maylén Leyanis Pérez Chi', username: 'maylen', mobile: '58702380', password: 'RadioCiudad1026', role: 'worker', classification: 'Usuario' },
  { name: 'Daylén Zalazar Maceo', username: 'daylen', mobile: '56540207', password: 'RadioCiudad1126', role: 'worker', classification: 'Usuario' },
  { name: 'Beatriz González Rondón', username: 'beatrizgonzalez', mobile: '58390181', password: 'RadioCiudad1226', role: 'worker', classification: 'Usuario' },
  { name: 'Johan Rey Escalona Naranjo', username: 'johan', mobile: '59996914', password: 'RadioCiudad1326', role: 'worker', classification: 'Usuario' },
  { name: 'Leipzig del Carmen Vázquez García', username: 'leipzig', mobile: '58401306', password: 'RadioCiudad1426', role: 'worker', classification: 'Usuario' },
  { name: 'Rafael Traba Bordón', username: 'rafael', mobile: '52143905', password: 'RadioCiudad1526', role: 'worker', classification: 'Usuario' },
  { name: 'Caridad Aguilar Rosabal', username: 'caridad', mobile: '56350265', password: 'RadioCiudad1626', role: 'worker', classification: 'Usuario' },
  { name: 'José González Cobo', username: 'jose', mobile: '54205626', password: 'RadioCiudad1726', role: 'worker', classification: 'Usuario' },
  { name: 'Rosana María Fernández Verdecia', username: 'rosana', mobile: '53535793', password: 'RadioCiudad1826', role: 'worker', classification: 'Usuario' },
];

export const INITIAL_NEWS: NewsItem[] = [];

export const getCurrentProgram = (): { name: string; time: string; image: string } => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // --- PRIORITY 1: Enlace a Radio Bayamo (3:00 PM to 7:00 AM next day) ---
  if (totalMinutes >= 900 || totalMinutes < 420) {
    return { 
      name: "Enlace a Radio Bayamo", 
      time: "3:00 PM - 7:00 AM", 
      image: "https://picsum.photos/id/39/200/200" 
    };
  }

  // --- PRIORITY 2: Noticieros ---
  if (totalMinutes >= 720 && totalMinutes < 750) {
    return { name: "Noticiero Provincial", time: "12:00 PM - 12:30 PM", image: "https://picsum.photos/id/20/200/200" };
  }

  if (totalMinutes >= 780 && totalMinutes < 810) {
    return { name: "Noticiero Nacional", time: "1:00 PM - 1:30 PM", image: "https://picsum.photos/id/24/200/200" };
  }

  // --- PRIORITY 3: Daily Programs ---
  if (day >= 1 && day <= 6) {
    if (totalMinutes >= 420 && totalMinutes < 538) 
      return { name: "Buenos Días Bayamo", time: "7:00 AM - 8:58 AM", image: "https://picsum.photos/id/100/200/200" };
    
    if (totalMinutes >= 540 && totalMinutes < 598) 
      return { name: "La Cumbancha", time: "9:00 AM - 9:58 AM", image: "https://picsum.photos/id/120/200/200" };

    if (totalMinutes >= 660 && totalMinutes < 675)
       return { name: "RCM Noticias", time: "11:00 AM - 11:15 AM", image: "https://picsum.photos/id/140/200/200" };
  }

  if (day >= 1 && day <= 5) {
    if (totalMinutes >= 600 && totalMinutes < 658) 
      return { name: "Todos en Casa", time: "10:00 AM - 10:58 AM", image: "https://picsum.photos/id/200/200/200" };

    if (totalMinutes >= 675 && totalMinutes < 718) 
      return { name: "Arte Bayamo", time: "11:15 AM - 11:58 AM", image: "https://picsum.photos/id/210/200/200" };

    if (totalMinutes >= 750 && totalMinutes < 778) 
      return { name: "Parada Joven", time: "12:30 PM - 12:58 PM", image: "https://picsum.photos/id/220/200/200" };

    if (totalMinutes >= 810 && totalMinutes < 898) 
      return { name: "Hablando con Juana", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/230/200/200" };
  }

  if (day === 6) { 
     if ((totalMinutes >= 675 && totalMinutes < 720) || (totalMinutes >= 750 && totalMinutes < 778))
        return { name: "Sigue a tu ritmo", time: "11:15 AM - 12:58 PM", image: "https://picsum.photos/id/300/200/200" };

     if (totalMinutes >= 810 && totalMinutes < 898) 
        return { name: "Al son de la radio", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/310/200/200" };
  }

  if (day === 0) { 
    if (totalMinutes >= 420 && totalMinutes < 598) {
        if (totalMinutes >= 540 && totalMinutes < 555) 
           return { name: "Coloreando melodías", time: "9:00 AM - 9:15 AM", image: "https://picsum.photos/id/400/200/200" };
        
        if (totalMinutes >= 555 && totalMinutes < 570) 
           return { name: "Alba y Crisol", time: "9:15 AM - 9:30 AM", image: "https://picsum.photos/id/401/200/200" };
        
        return { name: "Cómplices", time: "7:00 AM - 9:58 AM", image: "https://picsum.photos/id/402/200/200" };
    }

    if ((totalMinutes >= 600 && totalMinutes < 720) || (totalMinutes >= 750 && totalMinutes < 778))
       return { name: "Estación 95.3", time: "10:00 AM - 12:58 PM", image: "https://picsum.photos/id/403/200/200" };

    if (totalMinutes >= 810 && totalMinutes < 898) 
       return { name: "Palco de Domingo", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/404/200/200" };
  }

  return { name: "Música RCM", time: "Transmisión Continua", image: "https://picsum.photos/id/500/200/200" };
};