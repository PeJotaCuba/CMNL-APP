import { NewsItem } from '../../types';

// Mock data representing raw Facebook posts
const mockFacebookPosts = [
  {
    id: '1',
    message: 'NUEVO PROGRAMA DE RADIO\nPor Juan Pérez\nEstamos emocionados de anunciar nuestro nuevo programa matutino que comenzará la próxima semana. Sintonízanos para las mejores noticias y música.',
    created_time: '2026-03-30T10:00:00+0000',
    full_picture: 'https://picsum.photos/seed/radio1/800/600'
  },
  {
    id: '2',
    message: 'ENTREVISTA EXCLUSIVA CON EL ALCALDE\nPor María Gómez\nHoy tuvimos el honor de conversar con el alcalde sobre los nuevos proyectos de infraestructura para la ciudad. No te pierdas el resumen en nuestro sitio web.',
    created_time: '2026-03-29T15:30:00+0000',
    full_picture: 'https://picsum.photos/seed/radio2/800/600'
  },
  {
    id: '3',
    message: 'FESTIVAL DE MÚSICA LOCAL\nPor Carlos Rodríguez\nEste fin de semana se llevará a cabo el festival anual de música con bandas locales. Estaremos transmitiendo en vivo desde el evento.',
    created_time: '2026-03-28T09:15:00+0000',
    full_picture: 'https://picsum.photos/seed/radio3/800/600'
  },
  {
    id: '4',
    message: 'ACTUALIZACIÓN DEL CLIMA\nPor Ana Martínez\nSe esperan fuertes lluvias para esta tarde. Recomendamos tomar precauciones y mantenerse informados a través de nuestros boletines.',
    created_time: '2026-03-27T14:45:00+0000',
    full_picture: 'https://picsum.photos/seed/radio4/800/600'
  },
  {
    id: '5',
    message: 'CONCURSO PARA OYENTES\nPor Equipo CMNL\nParticipa en nuestro nuevo concurso y gana entradas para el concierto del mes. Solo tienes que llamar durante el programa de la tarde.',
    created_time: '2026-03-26T11:20:00+0000',
    full_picture: 'https://picsum.photos/seed/radio5/800/600'
  },
  {
    id: '6',
    message: 'This post should be ignored because it does not match the format.\nIt has no uppercase title.',
    created_time: '2026-03-25T10:00:00+0000'
  }
];

export const fetchNewsFromFacebook = async (): Promise<NewsItem[]> => {
  const news: NewsItem[] = [];
  
  try {
    const fbUrl = 'https://www.facebook.com/profile.php?id=100063566244429';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fbUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      const html = data.contents;
      
      // Extract text content from HTML to simplify parsing
      // We'll look for JSON blocks that Facebook uses to hydrate the page, 
      // specifically looking for "message":{"text":"..."} patterns.
      const messageRegex = /"message":\{"text":"(.*?)"\}/g;
      let match;
      const rawMessages: string[] = [];
      
      while ((match = messageRegex.exec(html)) !== null) {
        if (match[1]) {
          // Decode unicode escape sequences like \u00e1
          try {
            const decodedText = JSON.parse(`"${match[1]}"`);
            if (!rawMessages.includes(decodedText)) {
              rawMessages.push(decodedText);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // If we couldn't find JSON messages, try stripping HTML tags as a fallback
      if (rawMessages.length === 0) {
         const strippedHtml = html.replace(/<[^>]*>?/gm, '\n');
         // This is very messy, but we can try to find the pattern directly in the text
         rawMessages.push(strippedHtml);
      }

      // Pattern: 
      // 1. Title: All uppercase (letters, numbers, basic punctuation), at least 10 chars, ending with newline or " por "
      // 2. Author: "por " followed by name, ending with newline
      // 3. Body: The rest
      
      // We'll process the raw messages to find our specific format
      for (const text of rawMessages) {
        if (news.length >= 5) break;

        // Split by newlines to analyze line by line
        const lines = text.split(/\\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if line is all uppercase (Title candidate)
          // Allow letters, numbers, spaces, and basic punctuation
          const isUppercase = line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line) && line.length > 10;
          
          if (isUppercase) {
            // Found a potential title
            const title = line;
            let author = 'Equipo CMNL';
            let bodyStartIndex = i + 1;
            
            // Look for author in the next line
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              const authorMatch = nextLine.match(/^por\s+(.+)$/i);
              if (authorMatch) {
                author = authorMatch[1].trim();
                bodyStartIndex = i + 2;
              }
            }
            
            // Collect the rest as body
            const bodyLines = [];
            for (let j = bodyStartIndex; j < lines.length; j++) {
              // Stop if we hit another uppercase title candidate
              if (lines[j] === lines[j].toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(lines[j]) && lines[j].length > 10) {
                break; // Stop collecting body, next post starts
              }
              bodyLines.push(lines[j]);
            }
            
            const body = bodyLines.join('\n').trim();
            
            if (body.length > 0) {
              // Check if we already have this news item
              if (!news.some(n => n.title === title)) {
                news.push({
                  id: `fb-${Date.now()}-${news.length}`,
                  title: title,
                  author: author,
                  content: body,
                  category: 'Facebook',
                  date: new Date().toISOString(),
                  url: fbUrl, // Deep link to the page
                  excerpt: body.slice(0, 120) + (body.length > 120 ? '...' : '')
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Facebook scraping failed, using fallback data:', error);
  }

  // If scraping failed or found nothing, use mock data as fallback
  if (news.length === 0) {
    const titleRegex = /^([A-ZÁÉÍÓÚÑ0-9\s\p{P}]{10,})\n/u;
    const authorRegex = /^Por\s+(.+)\n/im;

    for (const post of mockFacebookPosts) {
      if (news.length >= 5) break;

      const titleMatch = post.message.match(titleRegex);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        let remainingText = post.message.substring(titleMatch[0].length);
        
        const authorMatch = remainingText.match(authorRegex);
        let author = 'Equipo CMNL';
        
        if (authorMatch) {
          author = authorMatch[1].trim();
          remainingText = remainingText.substring(authorMatch[0].length);
        }

        const body = remainingText.trim();

        news.push({
          id: post.id,
          title,
          author,
          content: body,
          category: 'Facebook',
          date: post.created_time,
          image: post.full_picture,
          url: 'https://www.facebook.com/profile.php?id=100063566244429',
          excerpt: body.slice(0, 100) + (body.length > 100 ? '...' : '')
        });
      }
    }
  }

  return news;
};

export const parseNewsFromFile = (fileContent: string): string => {
  // Remove tags "Titular:", "Autor:", "Texto:"
  let cleanContent = fileContent;
  cleanContent = cleanContent.replace(/Titular:\s*/gi, '');
  cleanContent = cleanContent.replace(/Autor:\s*/gi, '');
  cleanContent = cleanContent.replace(/Texto:\s*/gi, '');
  return cleanContent.trim();
};
