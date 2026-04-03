
const text = `Titular:
Una lectura más allá de una Matanza

Autor:
CMKX Radio Bayamo

Texto:
El béisbol cubano atraviesa un proceso de profunda reflexión tras los resultados adversos en la Liga de Campeones, donde el equipo de Matanzas sufrió derrotas históricas. El análisis deportivo publicado este lunes profundiza en la necesidad de cambios estructurales y el impacto de los nuevos patrocinios. Se busca entender la crisis del deporte nacional hoy.

________________________________________________________
Titular:
Miguel Díaz-Canel ratifica solidaridad de Cuba con el pueblo palestino

Autor:
Cubadebate

Texto:
El mandatario cubano reafirmó este lunes el compromiso histórico de la Revolución con la causa palestina en el marco del Día de la Tierra. A través de sus canales oficiales, denunció el genocidio que sufre ese pueblo y la ocupación ilegal de sus territorios. Cuba mantiene su postura firme en foros internacionales defendiendo su autodeterminación.`;

const blocks = text.split(/_{3,}/).filter(b => b.trim());
const newNews = blocks.map((block, index) => {
  const titularMatch = block.match(/Titular:\s*([\s\S]*?)(?=\n\n|\nAutor|Autor|$)/i);
  const autorMatch = block.match(/Autor(?: o fuente)?:\s*([\s\S]*?)(?=\n\n|\nTexto|Texto|$)/i);
  const textoMatch = block.match(/Texto:\s*([\s\S]*?)$/i);
  
  const title = titularMatch ? titularMatch[1].trim() : 'Sin Título';
  const author = autorMatch ? autorMatch[1].trim() : 'Anónimo';
  const content = textoMatch ? textoMatch[1].trim() : '';
  
  return {
    id: `news-${Date.now()}-${index}`,
    title,
    author,
    content,
    category: 'General',
    date: new Date().toLocaleDateString(),
    excerpt: content.split('. ')[0] + '.'
  };
});

console.log(newNews);
