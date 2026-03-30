
const parseNewsFromFile = (fileContent) => {
  const news = [];
  const chunks = fileContent.split('________________________________________________________');

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    const titularMatch = trimmedChunk.match(/Titular:\s*([\s\S]*?)(?=Autor:|$)/i);
    const autorMatch = trimmedChunk.match(/Autor:\s*([\s\S]*?)(?=Texto:|$)/i);
    const textoMatch = trimmedChunk.match(/Texto:\s*([\s\S]*?)(?=$)/i);

    if (titularMatch && autorMatch && textoMatch) {
      news.push({
        title: titularMatch[1].trim(),
        author: autorMatch[1].trim(),
        content: textoMatch[1].trim(),
      });
    }
  }
  return news;
};

const input = `Titular:
México trabaja para reanudar envío de petróleo a Cuba

Autor:
CMKX Radio Bayamo

Texto:
El gobierno mexicano realiza esfuerzos diplomáticos y logísticos para retomar el envío sistemático de crudo hacia la isla, una medida vital para estabilizar la economía nacional. La actual administración ha ratificado su postura contra el bloqueo, enfatizando la importancia de la soberanía energética compartida. Este apoyo resulta crucial ante las crecientes presiones externas actuales.

________________________________________________________
Titular:
Una lectura más allá de una Matanza

Autor:
CMKX Radio Bayamo

Texto:
El béisbol cubano atraviesa un proceso de profunda reflexión tras los resultados adversos en la Liga de Campeones, donde el equipo de Matanzas sufrió derrotas históricas. El análisis deportivo publicado este lunes profundiza en la necesidad de cambios estructurales y el impacto de los nuevos patrocinios. Se busca entender la crisis del deporte nacional hoy.`;

console.log(parseNewsFromFile(input));
