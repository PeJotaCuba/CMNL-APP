import { User, NewsItem } from '../types';

export const INITIAL_USERS: User[] = [
  { name: 'Pedro José Reyes Acuña', username: 'admin', mobile: '54413935', password: 'RCMM26', role: 'admin' },
  { name: 'Lissell Fontelo Danta', username: 'lissell', mobile: '58841705', password: 'RadioCiudad0226', role: 'worker' },
  { name: 'Ernesto José Parra Muñoz', username: 'ernesto', mobile: '52137105', password: 'RadioCiudad0326', role: 'worker' },
  { name: 'Jorge Luis Rosales Sánchez', username: 'jorge', mobile: '55326426', password: 'RadioCiudad0426', role: 'worker' },
  { name: 'Susel López Jiménez', username: 'susel', mobile: '54778270', password: 'RadioCiudad0526', role: 'worker' },
  { name: 'Arnaldo Ernesto Torres García', username: 'arnaldo', mobile: '53924841', password: 'RadioCiudad0626', role: 'worker' },
  { name: 'Beatriz Ganado Arias', username: 'beatriz', mobile: '54777754', password: 'RadioCiudad0726', role: 'worker' },
  { name: 'Rosa Aracelis Chi Cedeño', username: 'rosa', mobile: '54275723', password: 'RadioCiudad0826', role: 'worker' },
  { name: 'Abel Girardo Guerrero Castro', username: 'abel', mobile: '59195045', password: 'RadioCiudad0926', role: 'worker' },
  { name: 'Maylén Leyanis Pérez Chi', username: 'maylen', mobile: '58702380', password: 'RadioCiudad1026', role: 'worker' },
  { name: 'Daylén Zalazar Maceo', username: 'daylen', mobile: '56540207', password: 'RadioCiudad1126', role: 'worker' },
  { name: 'Beatriz González Rondón', username: 'beatrizgonzalez', mobile: '58390181', password: 'RadioCiudad1226', role: 'worker' },
  { name: 'Johan Rey Escalona Naranjo', username: 'johan', mobile: '59996914', password: 'RadioCiudad1326', role: 'worker' },
  { name: 'Leipzig del Carmen Vázquez García', username: 'leipzig', mobile: '58401306', password: 'RadioCiudad1426', role: 'worker' },
  { name: 'Rafael Traba Bordón', username: 'rafael', mobile: '52143905', password: 'RadioCiudad1526', role: 'worker' },
  { name: 'Caridad Aguilar Rosabal', username: 'caridad', mobile: '56350265', password: 'RadioCiudad1626', role: 'worker' },
  { name: 'José González Cobo', username: 'jose', mobile: '54205626', password: 'RadioCiudad1726', role: 'worker' },
  { name: 'Rosana María Fernández Verdecia', username: 'rosana', mobile: '53535793', password: 'RadioCiudad1826', role: 'worker' },
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Festival de la Trova comienza mañana',
    author: 'Redacción Cultural',
    content: 'Todo está listo en la plaza del himno para recibir a los artistas invitados...',
    date: 'Hace 2h',
    category: 'Cultura',
    image: 'https://picsum.photos/id/234/600/300'
  }
];

export const getCurrentProgram = (): { name: string; time: string; image: string } => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // --- PRIORITY 1: Enlace a Radio Bayamo (3:00 PM to 7:00 AM next day) ---
  // 15:00 is 900 minutes. 07:00 is 420 minutes.
  // If time is >= 15:00 OR time < 07:00
  if (totalMinutes >= 900 || totalMinutes < 420) {
    return { 
      name: "Enlace a Radio Bayamo", 
      time: "3:00 PM - 7:00 AM", 
      image: "https://picsum.photos/id/39/200/200" 
    };
  }

  // --- PRIORITY 2: Noticieros (Fixed times regardless of day within broadcast hours) ---
  
  // Noticiero Provincial (12:00 PM - 12:30 PM) -> 720 to 750
  if (totalMinutes >= 720 && totalMinutes < 750) {
    return { name: "Noticiero Provincial", time: "12:00 PM - 12:30 PM", image: "https://picsum.photos/id/20/200/200" };
  }

  // Noticiero Nacional (1:00 PM - 1:30 PM) -> 780 to 810
  if (totalMinutes >= 780 && totalMinutes < 810) {
    return { name: "Noticiero Nacional", time: "1:00 PM - 1:30 PM", image: "https://picsum.photos/id/24/200/200" };
  }

  // --- PRIORITY 3: Daily Programs (7:00 AM - 3:00 PM) ---

  // Lunes (1) a Sábado (6)
  if (day >= 1 && day <= 6) {
    // Buenos Días Bayamo (7:00 - 8:58) -> 420 to 538
    if (totalMinutes >= 420 && totalMinutes < 538) 
      return { name: "Buenos Días Bayamo", time: "7:00 AM - 8:58 AM", image: "https://picsum.photos/id/100/200/200" };
    
    // La Cumbancha (9:00 - 9:58) -> 540 to 598
    if (totalMinutes >= 540 && totalMinutes < 598) 
      return { name: "La Cumbancha", time: "9:00 AM - 9:58 AM", image: "https://picsum.photos/id/120/200/200" };

    // RCM Noticias (11:00 - 11:15) -> 660 to 675
    if (totalMinutes >= 660 && totalMinutes < 675)
       return { name: "RCM Noticias", time: "11:00 AM - 11:15 AM", image: "https://picsum.photos/id/140/200/200" };
  }

  // Lunes (1) a Viernes (5)
  if (day >= 1 && day <= 5) {
    // Todos en Casa (10:00 - 10:58) -> 600 to 658
    if (totalMinutes >= 600 && totalMinutes < 658) 
      return { name: "Todos en Casa", time: "10:00 AM - 10:58 AM", image: "https://picsum.photos/id/200/200/200" };

    // Arte Bayamo (11:15 - 11:58) -> 675 to 718
    if (totalMinutes >= 675 && totalMinutes < 718) 
      return { name: "Arte Bayamo", time: "11:15 AM - 11:58 AM", image: "https://picsum.photos/id/210/200/200" };

    // Parada Joven (12:30 - 12:58) -> 750 to 778
    if (totalMinutes >= 750 && totalMinutes < 778) 
      return { name: "Parada Joven", time: "12:30 PM - 12:58 PM", image: "https://picsum.photos/id/220/200/200" };

    // Hablando con Juana (1:30 - 2:58) -> 810 to 898
    if (totalMinutes >= 810 && totalMinutes < 898) 
      return { name: "Hablando con Juana", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/230/200/200" };
  }

  // Sábado (6)
  if (day === 6) { 
     // Sigue a tu ritmo (11:15 - 12:58) -> 675 to 778. NOTE: Gets interrupted by Noticiero Provincial (12:00-12:30)
     // We check the interrupt above, so this 'else if' logic works for the remaining blocks.
     if ((totalMinutes >= 675 && totalMinutes < 720) || (totalMinutes >= 750 && totalMinutes < 778))
        return { name: "Sigue a tu ritmo", time: "11:15 AM - 12:58 PM", image: "https://picsum.photos/id/300/200/200" };

     // Al son de la radio (1:30 - 2:58) -> 810 to 898
     if (totalMinutes >= 810 && totalMinutes < 898) 
        return { name: "Al son de la radio", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/310/200/200" };
  }

  // Domingo (0)
  if (day === 0) { 
    // Cómplices (7:00 - 9:58) -> 420 to 598
    if (totalMinutes >= 420 && totalMinutes < 598) {
        // Coloreando melodías (9:00 - 9:15) -> 540 to 555
        if (totalMinutes >= 540 && totalMinutes < 555) 
           return { name: "Coloreando melodías", time: "9:00 AM - 9:15 AM", image: "https://picsum.photos/id/400/200/200" };
        
        // Alba y Crisol (9:15 - 9:30) -> 555 to 570
        if (totalMinutes >= 555 && totalMinutes < 570) 
           return { name: "Alba y Crisol", time: "9:15 AM - 9:30 AM", image: "https://picsum.photos/id/401/200/200" };
        
        // Rest of Complices
        return { name: "Cómplices", time: "7:00 AM - 9:58 AM", image: "https://picsum.photos/id/402/200/200" };
    }

    // Estación 95.3 (10:00 - 12:58) -> 600 to 778
    // Interrupted by Noticiero Provincial at 12:00
    if ((totalMinutes >= 600 && totalMinutes < 720) || (totalMinutes >= 750 && totalMinutes < 778))
       return { name: "Estación 95.3", time: "10:00 AM - 12:58 PM", image: "https://picsum.photos/id/403/200/200" };

    // Palco de Domingo (1:30 - 2:58) -> 810 to 898
    if (totalMinutes >= 810 && totalMinutes < 898) 
       return { name: "Palco de Domingo", time: "1:30 PM - 2:58 PM", image: "https://picsum.photos/id/404/200/200" };
  }

  return { name: "Música RCM", time: "Transmisión Continua", image: "https://picsum.photos/id/500/200/200" };
};
