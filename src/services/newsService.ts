import { NewsItem } from '../../types';

export const parseNewsFromFile = (fileContent: string): NewsItem[] => {
  const news: NewsItem[] = [];
  // Use a more robust split that handles different line endings and whitespace around the delimiter
  const chunks = fileContent.split(/_{20,}/);

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    // Use more flexible regex to capture content
    const titularMatch = trimmedChunk.match(/Titular:\s*([\s\S]*?)\s*Autor:/i);
    const autorMatch = trimmedChunk.match(/Autor:\s*([\s\S]*?)\s*Texto:/i);
    const textoMatch = trimmedChunk.match(/Texto:\s*([\s\S]*?)(?=$)/i);

    if (titularMatch && autorMatch && textoMatch) {
      news.push({
        id: `txt-${Date.now()}-${news.length}`,
        title: titularMatch[1].trim(),
        author: autorMatch[1].trim(),
        content: textoMatch[1].trim(),
        category: 'Noticias',
        date: new Date().toISOString(),
        excerpt: textoMatch[1].trim().slice(0, 100) + '...'
      });
    }
  }
  return news;
};
