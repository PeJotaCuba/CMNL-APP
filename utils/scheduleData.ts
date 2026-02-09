import { User } from '../types';

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

export const getCurrentProgram = (): { name: string; time: string; image: string } => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // --- GLOBAL OVERRIDES ---
  
  // Noticiero Provincial (12:00 - 12:30)
  if (totalMinutes >= 12 * 60 && totalMinutes < 12 * 60 + 30) {
    return { name: "Noticiero Provincial", time: "12:00 PM - 12:30 PM", image: "https://picsum.photos/id/20/200/200" };
  }

  // Noticiero Nacional (13:00 - 13:30)
  if (totalMinutes >= 13 * 60 && totalMinutes < 13 * 60 + 30) {
    return { name: "Noticiero Nacional", time: "1:00 PM - 1:30 PM", image: "https://picsum.photos/id/24/200/200" };
  }

  // Radio Bayamo (15:00 - 19:00)
  if (totalMinutes >= 15 * 60 && totalMinutes < 19 * 60) {
    return { name: "Cadena Provincial", time: "3:00 PM - 7:00 PM", image: "https://picsum.photos/id/39/200/200" };
  }

  // --- DAY SPECIFIC ---

  if (day >= 1 && day <= 6) { // Monday (1) to Saturday (6)
    // Buenos Días Bayamo (7:00 - 8:58)
    if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60) 
      return { name: "Buenos Días Bayamo", time: "7:00 AM - 9:00 AM", image: "https://picsum.photos/id/100/200/200" };
    
    // La Cumbancha (9:00 - 9:58)
    if (totalMinutes >= 9 * 60 && totalMinutes < 10 * 60) 
      return { name: "La Cumbancha", time: "9:00 AM - 10:00 AM", image: "https://picsum.photos/id/120/200/200" };

    // RCM Noticias (11:00 - 11:15)
    if (totalMinutes >= 11 * 60 && totalMinutes < 11 * 60 + 15)
       return { name: "RCM Noticias", time: "11:00 AM - 11:15 AM", image: "https://picsum.photos/id/140/200/200" };
  }

  if (day >= 1 && day <= 5) { // Monday to Friday
    // Todos en Casa (10:00 - 10:58)
    if (totalMinutes >= 10 * 60 && totalMinutes < 11 * 60) 
      return { name: "Todos en Casa", time: "10:00 AM - 11:00 AM", image: "https://picsum.photos/id/200/200/200" };

    // Arte Bayamo (11:15 - 11:58) - Adjusted end to handle news overlap manually if needed, but assuming structure
    if (totalMinutes >= 11 * 60 + 15 && totalMinutes < 12 * 60) 
      return { name: "Arte Bayamo", time: "11:15 AM - 12:00 PM", image: "https://picsum.photos/id/210/200/200" };

    // Parada Joven (12:30 - 12:58)
    if (totalMinutes >= 12 * 60 + 30 && totalMinutes < 13 * 60) 
      return { name: "Parada Joven", time: "12:30 PM - 1:00 PM", image: "https://picsum.photos/id/220/200/200" };

    // Hablando con Juana (1:30 - 2:58)
    if (totalMinutes >= 13 * 60 + 30 && totalMinutes < 15 * 60) 
      return { name: "Hablando con Juana", time: "1:30 PM - 3:00 PM", image: "https://picsum.photos/id/230/200/200" };
  }

  if (day === 6) { // Saturday
     // Sigue a tu ritmo (11:15 - 12:58) Note: News interrupts 12:00-12:30
     if ((totalMinutes >= 11 * 60 + 15 && totalMinutes < 12 * 60) || (totalMinutes >= 12 * 60 + 30 && totalMinutes < 13 * 60))
        return { name: "Sigue a tu ritmo", time: "11:15 AM - 1:00 PM", image: "https://picsum.photos/id/300/200/200" };

     // Al son de la radio (1:30 - 2:58)
     if (totalMinutes >= 13 * 60 + 30 && totalMinutes < 15 * 60) 
        return { name: "Al son de la radio", time: "1:30 PM - 3:00 PM", image: "https://picsum.photos/id/310/200/200" };
  }

  if (day === 0) { // Sunday
    // Coloreando melodías (9:00 - 9:15)
    if (totalMinutes >= 9 * 60 && totalMinutes < 9 * 60 + 15) 
       return { name: "Coloreando melodías", time: "9:00 AM - 9:15 AM", image: "https://picsum.photos/id/400/200/200" };
    
    // Alba y Crisol (9:15 - 9:30)
    if (totalMinutes >= 9 * 60 + 15 && totalMinutes < 9 * 60 + 30) 
       return { name: "Alba y Crisol", time: "9:15 AM - 9:30 AM", image: "https://picsum.photos/id/401/200/200" };

    // Cómplices (7:00 - 9:58) - Handling the gap for small programs above
    if (totalMinutes >= 7 * 60 && totalMinutes < 10 * 60) {
        if (totalMinutes < 9 * 60 || totalMinutes >= 9 * 60 + 30)
            return { name: "Cómplices", time: "7:00 AM - 10:00 AM", image: "https://picsum.photos/id/402/200/200" };
    }

    // Estación 95.3 (10:00 - 12:58)
    if ((totalMinutes >= 10 * 60 && totalMinutes < 12 * 60) || (totalMinutes >= 12 * 60 + 30 && totalMinutes < 13 * 60))
       return { name: "Estación 95.3", time: "10:00 AM - 1:00 PM", image: "https://picsum.photos/id/403/200/200" };

    // Palco de Domingo (1:30 - 2:58)
    if (totalMinutes >= 13 * 60 + 30 && totalMinutes < 15 * 60) 
       return { name: "Palco de Domingo", time: "1:30 PM - 3:00 PM", image: "https://picsum.photos/id/404/200/200" };
  }

  return { name: "Música RCM", time: "Transmisión Continua", image: "https://picsum.photos/id/500/200/200" };
};
