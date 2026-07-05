import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/dictionary', async (req, res) => {
    const { word, mode } = req.body;
    if (!word) {
      res.status(400).json({ error: 'El parámetro "word" es requerido.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      
      if (mode === 'conjugation') {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analiza el verbo en español "${word}" y determina su infinitivo, gerundio, participio y sus conjugaciones en indicativo presente, pretérito perfecto simple, pretérito imperfecto, futuro simple, subjuntivo presente e imperativo.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                verb: { type: Type.STRING },
                infinitive: { type: Type.STRING },
                gerund: { type: Type.STRING },
                participle: { type: Type.STRING },
                indicativePresent: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 elementos: yo, tú, él/ella, nosotros, vosotros, ellos/ellas en presente de indicativo"
                },
                indicativePastPerfect: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 elementos en pretérito perfecto simple de indicativo"
                },
                indicativeImperfect: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 elementos en pretérito imperfecto de indicativo"
                },
                indicativeFuture: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 elementos en futuro simple de indicativo"
                },
                subjunctivePresent: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "6 elementos en presente de subjuntivo"
                },
                imperative: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "5 elementos en imperativo: tú, usted, nosotros, vosotros, ustedes"
                }
              },
              required: [
                "verb", "infinitive", "gerund", "participle", 
                "indicativePresent", "indicativePastPerfect", "indicativeImperfect", 
                "indicativeFuture", "subjunctivePresent", "imperative"
              ]
            }
          }
        });

        const resultText = response.text || "{}";
        res.json(JSON.parse(resultText));
      } else {
        // definition mode
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Busca el significado, categoría gramatical, sinónimos, antónimos y ejemplos de la palabra en español "${word}".`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                category: { type: Type.STRING, description: "Categoría gramatical" },
                meanings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Significados o definiciones"
                },
                synonyms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Sinónimos"
                },
                antonyms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Antónimos"
                },
                examples: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Ejemplos de uso"
                }
              },
              required: ["word", "category", "meanings", "synonyms", "antonyms", "examples"]
            }
          }
        });

        const resultText = response.text || "{}";
        res.json(JSON.parse(resultText));
      }
    } catch (error: any) {
      console.error('Error en el diccionario:', error.message);
      res.status(500).json({ error: `Error al consultar el diccionario: ${error.message}` });
    }
  });

  app.post('/api/encrypt-pdf', async (req, res) => {
    const { pdfBase64, password } = req.body;
    if (!pdfBase64 || !password) {
      res.status(400).json({ error: 'Faltan parámetros requeridos (pdfBase64, password)' });
      return;
    }

    const rand = Math.random().toString(36).substring(7);
    const inputPath = path.join('/tmp', `in_${rand}.pdf`);
    const outputPath = path.join('/tmp', `out_${rand}.pdf`);

    try {
      const buffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(inputPath, buffer);

      const args = [
        '-q',
        '-dNOPAUSE',
        '-dBATCH',
        '-sDEVICE=pdfwrite',
        `-sUserPassword=${password}`,
        `-sOwnerPassword=${password}`,
        '-dEncryptionLength=128',
        `-sOutputFile=${outputPath}`,
        inputPath
      ];

      execFileSync('gs', args);

      if (fs.existsSync(outputPath)) {
        const encryptedBuffer = fs.readFileSync(outputPath);
        const encryptedBase64 = encryptedBuffer.toString('base64');
        res.json({ pdfBase64: encryptedBase64 });
      } else {
        res.status(500).json({ error: 'Ghostscript falló al generar el archivo cifrado' });
      }
    } catch (error: any) {
      console.error('Error al cifrar PDF:', error.message);
      res.status(500).json({ error: `Fallo de cifrado: ${error.message}` });
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {
        // Ignore files not found
      }
    }
  });

  app.post('/api/news', async (req, res) => {
    const { url } = req.body;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const html = await response.text();
      const $ = cheerio.load(html);
      const headlines: any[] = [];

      // Selectores personalizados por dominio
      let elements;
      if (url.includes('cubadebate.cu')) {
        elements = $('.title a, .note_title a, article h2 a');
      } else {
        elements = $('article h2 a, .main-content h2 a, h2 a');
      }

      elements.each((i, el) => {
        if (headlines.length >= 5) return false;
        const title = $(el).text().trim();
        if (!title) return;
        let link = $(el).attr('href');
        if (link && link.startsWith('/')) {
          try {
            const domain = new URL(url).origin;
            link = domain + link;
          } catch (e) {
            // Ignore invalid URLs
          }
        }
        // Resumen: buscar párrafo cercano
        let summary = '';
        const parent = $(el).closest('article, .news-item, .item');
        if (parent.length) {
          summary = parent.find('p').first().text().trim();
        }
        headlines.push({ id: i, title, summary, link });
      });

      res.json(headlines);
    } catch (error: any) {
      console.error(`Error scraping ${url}:`, error.message);
      res.status(200).json([{ title: 'Conexión interrumpida', link: url }]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
