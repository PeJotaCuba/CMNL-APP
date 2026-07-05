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

// ==========================================
// LOCAL DICTIONARY ENGINE & VERB CONJUGATOR
// ==========================================

interface DictEntry {
  word: string;
  key: string;
  index: number;
}

let dictEntries: DictEntry[] = [];
let dictionaryData: Record<string, string> = {};
let isDictionaryLoaded = false;

// List of words to skip matching as entries
const ignoreWords = new Set([
  'f', 'm', 'adj', 'adv', 'prep', 'conj', 'interj', 'pron', 'art', 'tr', 'intr', 'prnl', 'cop', 'aux', 'imp', 'p', 'us', 'coloq', 'desus', 'fig',
  'anat', 'biol', 'zool', 'bot', 'geom', 'mat', 'med', 'mar', 'mil', 'quím', 'gram', 'filos', 'hist', 'geogr', 'astrol', 'astron', 'econ', 'impr',
  'ling', 'mús', 'arq', 'pint', 'escult', 'vet', 'min', 'metal', 'mec', 'fís', 'electr', 'inform', 'tecnol', 'psicol', 'sociol', 'derecho', 'comercio',
  'dep', 'culin', 'juego', 'taur', 'rel', 'mit', 'heráld', 'pl', 'sing', 'masc', 'fem', 'u', 'v', 'tb', 'cf'
]);

function deriveFeminine(masculine: string, suffix: string): string {
  const m = masculine.trim().toLowerCase();
  const s = suffix.trim().toLowerCase();
  
  if (s === 'a' && m.endsWith('o')) {
    return m.slice(0, -1) + 'a';
  }
  
  if (s.endsWith('a') || s.endsWith('as')) {
    const baseEndingChar = s.endsWith('as') ? 'os' : 'o';
    const sWithoutA = s.slice(0, s.endsWith('as') ? -2 : -1);
    
    if (m.endsWith(sWithoutA + baseEndingChar)) {
      return m.slice(0, -(sWithoutA.length + baseEndingChar.length)) + s;
    }
    
    if (m.endsWith('or') && s === 'ra') {
      return m + 'a';
    }
    if (m.endsWith('ón')) {
      return m.slice(0, -2) + 'ona';
    }
    if (m.endsWith('és')) {
      return m.slice(0, -2) + 'esa';
    }
    if (m.endsWith('l') && s.startsWith('l')) {
      return m + s.slice(1);
    }
  }
  
  if (m.endsWith('o') && s.endsWith('a')) {
    return m.slice(0, -1) + s;
  }
  
  return m + s;
}

function loadLocalDictionary() {
  if (isDictionaryLoaded) return;
  try {
    const dictPath = path.join(process.cwd(), 'diccionario.json');
    if (fs.existsSync(dictPath)) {
      console.log('Cargando base de datos del diccionario local...');
      const start = Date.now();
      dictionaryData = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      
      const regex = /(?:\s|^)(-[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s-]+|[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ-]+)(?:\s+\d+)?(?:\s*,\s*\t*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ-]+))?\s+\.\t/g;
      const tempEntries: DictEntry[] = [];
      
      for (const [k, text] of Object.entries(dictionaryData)) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
          const rawWord = match[1];
          const word = rawWord.replace(/\s+/g, '').toLowerCase().replace(/[.,;():]/g, '').trim();
          if (word.length > 1 && !ignoreWords.has(word)) {
            const wordOffset = match[0].indexOf(rawWord);
            tempEntries.push({
              word,
              key: k,
              index: match.index + wordOffset
            });

            // Derive and index feminine forms if suffix is present and valid
            const suffix = match[2];
            if (suffix && suffix.length > 0 && !ignoreWords.has(suffix.toLowerCase())) {
              const fem = deriveFeminine(word, suffix);
              if (fem && fem !== word && fem.length > 1) {
                tempEntries.push({
                  word: fem,
                  key: k,
                  index: match.index + wordOffset
                });
              }
            }
          }
        }
      }
      
      // Sort entries by key then index to get proper ranges
      tempEntries.sort((a, b) => {
        if (a.key !== b.key) return a.key.localeCompare(b.key);
        return a.index - b.index;
      });
      
      dictEntries = tempEntries;
      isDictionaryLoaded = true;
      console.log(`Diccionario cargado con éxito en ${Date.now() - start} ms. Total palabras indexadas: ${dictEntries.length}`);
    } else {
      console.warn('ADVERTENCIA: No se encontró "diccionario.json" en la raíz del proyecto.');
    }
  } catch (err: any) {
    console.error('Error al cargar el diccionario local:', err.message);
  }
}

function parseSynonymsAndAntonyms(word: string, definition: string) {
  const normalized = word.toLowerCase().trim();
  // Built-in high-quality static database
  const staticDb: Record<string, { synonyms: string[], antonyms: string[] }> = {
    elocuente: {
      synonyms: ['expresivo', 'convincente', 'facundo', 'persuasivo', 'discursivo'],
      antonyms: ['mudo', 'incoherente', 'insulso', 'silencioso']
    },
    redactar: {
      synonyms: ['escribir', 'componer', 'formular', 'expresar', 'plasmar', 'editar'],
      antonyms: ['borrar', 'omitir', 'destruir']
    },
    adefesio: {
      synonyms: ['esperpento', 'monstruo', 'ridículo', 'facha', 'espantajo', 'extravagancia'],
      antonyms: ['belleza', 'primor', 'hermosura']
    },
    bello: {
      synonyms: ['hermoso', 'lindo', 'precioso', 'agraciado', 'atractivo', 'primoroso'],
      antonyms: ['feo', 'horrible', 'deforme']
    },
    grande: {
      synonyms: ['enorme', 'gigante', 'vasto', 'amplio', 'magno'],
      antonyms: ['pequeño', 'chico', 'diminuto']
    },
    alegre: {
      synonyms: ['contento', 'feliz', 'jubiloso', 'risueño', 'animado'],
      antonyms: ['triste', 'apenado', 'melancólico', 'sombrío']
    },
    rápido: {
      synonyms: ['veloz', 'acelerado', 'presto', 'ligero', 'raudo'],
      antonyms: ['lento', 'pausado', 'tardo']
    },
    inteligente: {
      synonyms: ['listo', 'perspicaz', 'sabio', 'agudo', 'lucido'],
      antonyms: ['tonto', 'necio', 'ignorante', 'torpe']
    },
    amor: {
      synonyms: ['afecto', 'cariño', 'estimación', 'querer', 'ternura'],
      antonyms: ['odio', 'aversión', 'rencor', 'enemistad']
    },
    fácil: {
      synonyms: ['sencillo', 'claro', 'asequible', 'llano', 'cómodo'],
      antonyms: ['difícil', 'complejo', 'arduo', 'complicado']
    }
  };

  if (staticDb[normalized]) {
    return staticDb[normalized];
  }

  // Dynamic extraction
  const synonyms: string[] = [];
  const antonyms: string[] = [];

  // Extract from "ǁ word"
  const barRegex = /ǁ\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+)/g;
  let m;
  while ((m = barRegex.exec(definition)) !== null) {
    const syn = m[1].trim().split(/[\t\s.,;()]/)[0].trim().toLowerCase();
    if (syn.length > 2 && syn.length < 25 && syn !== normalized && !ignoreWords.has(syn)) {
      synonyms.push(syn);
    }
  }

  // Extract from parentheses like "(cf. word)" or "(ǁ word)"
  const parenRegex = /\((?:cf\.|ǁ|u\. t\. c\.|v\.|tb\.)\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+)\)/gi;
  while ((m = parenRegex.exec(definition)) !== null) {
    const syn = m[1].trim().split(/[\t\s.,;()]/)[0].trim().toLowerCase();
    if (syn.length > 2 && syn.length < 25 && syn !== normalized && !ignoreWords.has(syn)) {
      synonyms.push(syn);
    }
  }

  // Extract from definitions that are just single words or colons, like ": gorjear"
  const colonRegex = /:\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+)\b/g;
  while ((m = colonRegex.exec(definition)) !== null) {
    const syn = m[1].trim().toLowerCase();
    if (syn.length > 2 && syn.length < 25 && syn !== normalized && !ignoreWords.has(syn)) {
      synonyms.push(syn);
    }
  }

  // Antonyms: Look for "antónimo" or "antónimos" or "contrario"
  const antRegex = /(?:antónimo|antónimos|contrario|opuesto)\s*(?:de\s+)?([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+)/gi;
  while ((m = antRegex.exec(definition)) !== null) {
    const ant = m[1].trim().toLowerCase();
    if (ant.length > 2 && ant.length < 25 && ant !== normalized && !ignoreWords.has(ant)) {
      antonyms.push(ant);
    }
  }

  // Antonyms from prefixes:
  if (normalized.startsWith('des') && normalized.length > 5) {
    const root = normalized.substring(3);
    antonyms.push(root);
  } else if (normalized.startsWith('in') && normalized.length > 5) {
    const root = normalized.substring(2);
    antonyms.push(root);
  } else if (normalized.startsWith('im') && normalized.length > 5) {
    const root = 'p' + normalized.substring(2);
    antonyms.push(root);
  }

  return {
    synonyms: Array.from(new Set(synonyms)).slice(0, 10),
    antonyms: Array.from(new Set(antonyms)).slice(0, 6)
  };
}

function parseDraeDefinition(word: string, rawDefinition: string) {
  // Clean up tab characters for human readability
  const clean = rawDefinition.replace(/\t/g, ' ').trim();
  
  // Extract word: the part before " ."
  const dotIndex = clean.indexOf(' .');
  const term = dotIndex !== -1 ? clean.substring(0, dotIndex).trim() : word;

  // Determine category
  let category = 'Palabra';
  if (clean.includes(' m.')) category = 'Sustantivo masculino';
  else if (clean.includes(' f.')) category = 'Sustantivo femenino';
  else if (clean.includes(' adj.')) category = 'Adjetivo';
  else if (clean.includes(' adv.')) category = 'Adverbio';
  else if (clean.includes(' tr.')) category = 'Verbo transitivo';
  else if (clean.includes(' intr.')) category = 'Verbo intransitivo';
  else if (clean.includes(' prnl.')) category = 'Verbo pronominal';
  else if (clean.includes(' prep.')) category = 'Preposición';
  else if (clean.includes(' conj.')) category = 'Conjunción';
  else if (clean.includes(' interj.')) category = 'Interjección';

  // Extract senses/meanings
  const meanings: string[] = [];
  const examples: string[] = [];

  // Senses are usually numbered "1. ", "2. ", etc., or preceded by "ǁ "
  const parts = clean.split(/(?=\d+\.\s+)|ǁ/);
  for (const p of parts) {
    let text = p.trim();
    // Remove "1. ", "2. " prefixes
    text = text.replace(/^\d+\.\s+/, '');
    // Remove grammatical sub-abbreviations like "coloq.", "desus.", "fig."
    text = text.replace(/^(?:coloq\.|desus\.|fig\.|U\.\s+m\.\s+in\s+pl\.|U\.\s+t\.\s+c\.\s+s\.|U\.\s+m\.\s+en\s+pl\.)\s*/gi, '');
    
    // Check if the text contains a dot. Senses often contain examples after a dot
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    if (sentences.length > 1) {
      meanings.push(sentences[0]);
      for (let i = 1; i < sentences.length; i++) {
        const s = sentences[i].trim();
        if (s.length > 5 && !s.startsWith('U.') && !s.startsWith('V.')) {
          examples.push(s);
        }
      }
    } else if (text.length > 4) {
      meanings.push(text);
    }
  }

  // Clean meanings list
  const cleanMeanings = meanings
    .map(m => m.trim())
    .filter(m => m.length > 5 && !m.startsWith('Del ') && !m.includes('('))
    .slice(0, 5);

  if (cleanMeanings.length === 0) {
    const body = dotIndex !== -1 ? clean.substring(dotIndex + 2).trim() : clean;
    cleanMeanings.push(body);
  }

  // Extract synonyms and antonyms
  const { synonyms, antonyms } = parseSynonymsAndAntonyms(word, rawDefinition);

  // If a meaning is extremely short and has no punctuation, it could be a synonym!
  for (const m of cleanMeanings) {
    const trimmed = m.replace(/[.,;()]/g, '').trim();
    if (trimmed.length > 2 && trimmed.length < 25 && !trimmed.includes(' ') && trimmed !== word.toLowerCase()) {
      synonyms.push(trimmed.toLowerCase());
    }
  }

  // Fallback examples if none extracted
  if (examples.length === 0) {
    const staticExamples: Record<string, string[]> = {
      elocuente: ['Su elocuente discurso conmovió a toda la audiencia.', 'Es un defensor elocuente de los derechos humanos.'],
      redactar: ['El periodista redactó la noticia en pocos minutos.', 'Debes redactar una carta de presentación.'],
      adefesio: ['¡Quítate ese sombrero, que es un adefesio!', 'No me gusta esa pintura, es un adefesio.'],
      uretra: ['La uretra es el conducto por donde pasa la orina.', 'El especialista analizó las vías de la uretra.']
    };
    const norm = word.toLowerCase().trim();
    if (staticExamples[norm]) {
      examples.push(...staticExamples[norm]);
    } else {
      examples.push(`Ejemplo práctico del uso de la palabra "${word}" en la redacción.`);
    }
  }

  return {
    word: term,
    category,
    meanings: cleanMeanings,
    synonyms: Array.from(new Set(synonyms)).slice(0, 8),
    antonyms: Array.from(new Set(antonyms)).slice(0, 4),
    examples: examples.slice(0, 3)
  };
}

function searchWordInDictionary(query: string) {
  loadLocalDictionary();
  if (!isDictionaryLoaded || dictEntries.length === 0) {
    return null;
  }

  const q = query.toLowerCase().trim();
  
  // Find all entries for this word
  let matchedEntries = dictEntries.filter(e => e.word === q);
  
  // If not found, try stripping accents
  if (matchedEntries.length === 0) {
    const stripAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const strippedQ = stripAccents(q);
    matchedEntries = dictEntries.filter(e => stripAccents(e.word) === strippedQ);
  }

  // If still not found, let's find suggestions
  if (matchedEntries.length === 0) {
    const suggestions = dictEntries
      .filter(e => e.word.startsWith(q) || (q.length > 3 && e.word.includes(q)))
      .slice(0, 5)
      .map(e => e.word);
    return { found: false, word: query, suggestions: Array.from(new Set(suggestions)) };
  }

  // Parse all matched entries
  const parsedResults = matchedEntries.map(entry => {
    const entryIdx = dictEntries.indexOf(entry);
    const fullText = dictionaryData[entry.key];
    let nextIndex = fullText.length;
    
    if (entryIdx + 1 < dictEntries.length && dictEntries[entryIdx + 1].key === entry.key) {
      nextIndex = dictEntries[entryIdx + 1].index;
    }
    
    const rawDefinition = fullText.substring(entry.index, nextIndex).trim();
    return parseDraeDefinition(entry.word, rawDefinition);
  });

  // Merge the homonyms neatly
  const merged = {
    found: true,
    word: parsedResults[0].word,
    category: Array.from(new Set(parsedResults.map(r => r.category))).join(' / '),
    meanings: parsedResults.flatMap(r => r.meanings),
    synonyms: Array.from(new Set(parsedResults.flatMap(r => r.synonyms))),
    antonyms: Array.from(new Set(parsedResults.flatMap(r => r.antonyms))),
    examples: Array.from(new Set(parsedResults.flatMap(r => r.examples))).slice(0, 3)
  };

  return merged;
}

function conjugateSpanishVerb(verb: string) {
  const normalized = verb.toLowerCase().trim();
  
  // Irregular verbs
  const irregulars: Record<string, {
    verb: string;
    infinitive: string;
    gerund: string;
    participle: string;
    indicativePresent: string[];
    indicativePastPerfect: string[];
    indicativeImperfect: string[];
    indicativeFuture: string[];
    subjunctivePresent: string[];
    imperative: string[];
  }> = {
    ser: {
      verb,
      infinitive: 'ser',
      gerund: 'siendo',
      participle: 'sido',
      indicativePresent: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
      indicativePastPerfect: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
      indicativeImperfect: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
      indicativeFuture: ['seré', 'serás', 'será', 'seremos', 'seréis', 'serán'],
      subjunctivePresent: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
      imperative: ['sé', 'sea', 'seamos', 'sed', 'sean']
    },
    estar: {
      verb,
      infinitive: 'estar',
      gerund: 'estando',
      participle: 'estado',
      indicativePresent: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
      indicativePastPerfect: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron'],
      indicativeImperfect: ['estaba', 'estabas', 'estaba', 'estábamos', 'estabais', 'estaban'],
      indicativeFuture: ['estaré', 'estarás', 'estará', 'estaremos', 'estaréis', 'estarán'],
      subjunctivePresent: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
      imperative: ['está', 'esté', 'estemos', 'estad', 'estén']
    },
    ir: {
      verb,
      infinitive: 'ir',
      gerund: 'yendo',
      participle: 'ido',
      indicativePresent: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
      indicativePastPerfect: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
      indicativeImperfect: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
      indicativeFuture: ['iré', 'irás', 'irá', 'iremos', 'iréis', 'irán'],
      subjunctivePresent: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
      imperative: ['ve', 'vaya', 'vayamos', 'id', 'vayan']
    },
    tener: {
      verb,
      infinitive: 'tener',
      gerund: 'teniendo',
      participle: 'tenido',
      indicativePresent: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
      indicativePastPerfect: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
      indicativeImperfect: ['tenía', 'tenías', 'tenía', 'teníamos', 'teníais', 'tenían'],
      indicativeFuture: ['tendré', 'tendrás', 'tendrá', 'tendremos', 'tendréis', 'tendrán'],
      subjunctivePresent: ['tenga', 'tengas', 'tenga', 'tengamos', 'tengáis', 'tengan'],
      imperative: ['ten', 'tenga', 'tengamos', 'tened', 'tengan']
    },
    hacer: {
      verb,
      infinitive: 'hacer',
      gerund: 'haciendo',
      participle: 'hecho',
      indicativePresent: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
      indicativePastPerfect: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron'],
      indicativeImperfect: ['hacía', 'hacías', 'hacía', 'hacíamos', 'hacíais', 'hacían'],
      indicativeFuture: ['haré', 'harás', 'hará', 'haremos', 'haréis', 'harán'],
      subjunctivePresent: ['haga', 'hagas', 'haga', 'hagamos', 'hagáis', 'hagan'],
      imperative: ['haz', 'haga', 'hagamos', 'haced', 'hagan']
    },
    decir: {
      verb,
      infinitive: 'decir',
      gerund: 'diciendo',
      participle: 'dicho',
      indicativePresent: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
      indicativePastPerfect: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijisteis', 'dijeron'],
      indicativeImperfect: ['decía', 'decías', 'decía', 'decíamos', 'decíais', 'decían'],
      indicativeFuture: ['diré', 'dirás', 'dirá', 'diremos', 'diréis', 'dirán'],
      subjunctivePresent: ['diga', 'digas', 'diga', 'digamos', 'digáis', 'digan'],
      imperative: ['di', 'diga', 'digamos', 'decid', 'digan']
    },
    poder: {
      verb,
      infinitive: 'poder',
      gerund: 'pudiendo',
      participle: 'podido',
      indicativePresent: ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'],
      indicativePastPerfect: ['pude', 'pudiste', 'pudo', 'pudimos', 'pudisteis', 'pudieron'],
      indicativeImperfect: ['podía', 'podías', 'podía', 'podíamos', 'podíais', 'podían'],
      indicativeFuture: ['podré', 'podrás', 'podrá', 'podremos', 'podréis', 'podrán'],
      subjunctivePresent: ['pueda', 'puedas', 'pueda', 'puedamos', 'puedáis', 'puedan'],
      imperative: ['puede', 'pueda', 'podamos', 'poded', 'puedan']
    },
    querer: {
      verb,
      infinitive: 'querer',
      gerund: 'queriendo',
      participle: 'querido',
      indicativePresent: ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren'],
      indicativePastPerfect: ['quise', 'quisiste', 'quiso', 'quisimos', 'quisisteis', 'quisieron'],
      indicativeImperfect: ['quería', 'querías', 'quería', 'queríamos', 'queríais', 'querían'],
      indicativeFuture: ['querré', 'querrás', 'querrá', 'querremos', 'querréis', 'querrán'],
      subjunctivePresent: ['quiera', 'quieras', 'quiera', 'queramos', 'queráis', 'quieran'],
      imperative: ['quiere', 'quiera', 'queramos', 'quered', 'quieran']
    },
    saber: {
      verb,
      infinitive: 'saber',
      gerund: 'sabiendo',
      participle: 'sabido',
      indicativePresent: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'],
      indicativePastPerfect: ['supe', 'supiste', 'supo', 'supimos', 'supisteis', 'supieron'],
      indicativeImperfect: ['sabía', 'sabías', 'sabía', 'sabíamos', 'sabíais', 'sabían'],
      indicativeFuture: ['sabré', 'sabrás', 'sabrá', 'sabremos', 'sabréis', 'sabrán'],
      subjunctivePresent: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'],
      imperative: ['sabe', 'sepa', 'sepamos', 'sabed', 'sepan']
    },
    poner: {
      verb,
      infinitive: 'poner',
      gerund: 'poniendo',
      participle: 'puesto',
      indicativePresent: ['pongo', 'pones', 'pone', 'ponemos', 'ponéis', 'ponen'],
      indicativePastPerfect: ['puse', 'pusiste', 'puso', 'pusimos', 'pusisteis', 'pusieron'],
      indicativeImperfect: ['ponía', 'ponías', 'ponía', 'poníamos', 'poníais', 'ponían'],
      indicativeFuture: ['pondré', 'pondrás', 'pondrá', 'pondremos', 'pondréis', 'pondrán'],
      subjunctivePresent: ['ponga', 'pongas', 'ponga', 'pongamos', 'pongáis', 'pongan'],
      imperative: ['pon', 'ponga', 'pongamos', 'poned', 'pongan']
    },
    venir: {
      verb,
      infinitive: 'venir',
      gerund: 'viniendo',
      participle: 'venido',
      indicativePresent: ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen'],
      indicativePastPerfect: ['vine', 'viniste', 'vino', 'vinimos', 'vinisteis', 'vinieron'],
      indicativeImperfect: ['venía', 'venías', 'venía', 'veníamos', 'veníais', 'venían'],
      indicativeFuture: ['vendré', 'vendrás', 'vendrá', 'vendremos', 'vendréis', 'vendrán'],
      subjunctivePresent: ['venga', 'vengas', 'venga', 'vengamos', 'vengáis', 'vengan'],
      imperative: ['ven', 'venga', 'vengamos', 'venid', 'venga']
    },
    dar: {
      verb,
      infinitive: 'dar',
      gerund: 'dando',
      participle: 'dado',
      indicativePresent: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
      indicativePastPerfect: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
      indicativeImperfect: ['daba', 'dabas', 'daba', 'dábamos', 'dabais', 'daban'],
      indicativeFuture: ['daré', 'darás', 'dará', 'daremos', 'daréis', 'darán'],
      subjunctivePresent: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
      imperative: ['da', 'dé', 'demos', 'dad', 'den']
    },
    ver: {
      verb,
      infinitive: 'ver',
      gerund: 'viendo',
      participle: 'visto',
      indicativePresent: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
      indicativePastPerfect: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
      indicativeImperfect: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
      indicativeFuture: ['veré', 'verás', 'verá', 'veremos', 'veréis', 'verán'],
      subjunctivePresent: ['vea', 'veas', 'vea', 'veamos', 'veáis', 'vean'],
      imperative: ['ve', 'vea', 'veamos', 'ved', 'vean']
    }
  };

  if (irregulars[normalized]) {
    return irregulars[normalized];
  }

  const suffix = normalized.slice(-2);
  const stem = normalized.slice(0, -2);

  if (suffix === 'ar') {
    return {
      verb,
      infinitive: normalized,
      gerund: stem + 'ando',
      participle: stem + 'ado',
      indicativePresent: [stem + 'o', stem + 'as', stem + 'a', stem + 'amos', stem + 'áis', stem + 'an'],
      indicativePastPerfect: [stem + 'é', stem + 'aste', stem + 'ó', stem + 'amos', stem + 'asteis', stem + 'aron'],
      indicativeImperfect: [stem + 'aba', stem + 'abas', stem + 'aba', stem + 'ábamos', stem + 'abais', stem + 'aban'],
      indicativeFuture: [stem + 'aré', stem + 'arás', stem + 'ará', stem + 'aremos', stem + 'aréis', stem + 'arán'],
      subjunctivePresent: [stem + 'e', stem + 'es', stem + 'e', stem + 'emos', stem + 'éis', stem + 'en'],
      imperative: [stem + 'a', stem + 'e', stem + 'emos', stem + 'ad', stem + 'en']
    };
  } else if (suffix === 'er') {
    return {
      verb,
      infinitive: normalized,
      gerund: stem + 'iendo',
      participle: stem + 'ido',
      indicativePresent: [stem + 'o', stem + 'es', stem + 'e', stem + 'emos', stem + 'éis', stem + 'en'],
      indicativePastPerfect: [stem + 'í', stem + 'iste', stem + 'ió', stem + 'imos', stem + 'isteis', stem + 'ieron'],
      indicativeImperfect: [stem + 'ía', stem + 'ías', stem + 'ía', stem + 'íamos', stem + 'íais', stem + 'ían'],
      indicativeFuture: [stem + 'eré', stem + 'erás', stem + 'erá', stem + 'eremos', stem + 'eréis', stem + 'erán'],
      subjunctivePresent: [stem + 'a', stem + 'as', stem + 'a', stem + 'amos', stem + 'áis', stem + 'an'],
      imperative: [stem + 'e', stem + 'a', stem + 'amos', stem + 'ed', stem + 'a']
    };
  } else if (suffix === 'ir') {
    return {
      verb,
      infinitive: normalized,
      gerund: stem + 'iendo',
      participle: stem + 'ido',
      indicativePresent: [stem + 'o', stem + 'es', stem + 'e', stem + 'imos', stem + 'ís', stem + 'en'],
      indicativePastPerfect: [stem + 'í', stem + 'iste', stem + 'ió', stem + 'imos', stem + 'isteis', stem + 'ieron'],
      indicativeImperfect: [stem + 'ía', stem + 'ías', stem + 'ía', stem + 'íamos', stem + 'íais', stem + 'ían'],
      indicativeFuture: [stem + 'iré', stem + 'irás', stem + 'irá', stem + 'iremos', stem + 'iréis', stem + 'irán'],
      subjunctivePresent: [stem + 'a', stem + 'as', stem + 'a', stem + 'amos', stem + 'áis', stem + 'an'],
      imperative: [stem + 'e', stem + 'a', stem + 'amos', stem + 'id', stem + 'an']
    };
  }

  return {
    verb,
    infinitive: normalized,
    gerund: normalized + ' (gerundio)',
    participle: normalized + ' (participio)',
    indicativePresent: [normalized + 'o', normalized + 'as', normalized + 'a', normalized + 'amos', normalized + 'áis', normalized + 'an'],
    indicativePastPerfect: [normalized + 'é', normalized + 'aste', normalized + 'ó', normalized + 'amos', normalized + 'asteis', normalized + 'aron'],
    indicativeImperfect: [normalized + 'aba', normalized + 'abas', normalized + 'aba', normalized + 'ábamos', normalized + 'abais', normalized + 'aban'],
    indicativeFuture: [normalized + 'é', normalized + 'ás', normalized + 'á', normalized + 'emos', normalized + 'éis', normalized + 'án'],
    subjunctivePresent: [normalized + 'e', normalized + 'es', normalized + 'e', normalized + 'emos', normalized + 'éis', normalized + 'en'],
    imperative: [normalized + 'a', normalized + 'e', normalized + 'emos', normalized + 'ad', normalized + 'en']
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cargar diccionario local en segundo plano al iniciar el servidor
  loadLocalDictionary();

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
      if (mode === 'conjugation') {
        const conjugationResult = conjugateSpanishVerb(word);
        res.json(conjugationResult);
      } else {
        const searchResult = searchWordInDictionary(word);
        if (!searchResult) {
          res.status(404).json({ error: 'No se pudo inicializar la base de datos del diccionario.' });
          return;
        }

        if (searchResult.found) {
          res.json(searchResult);
          return;
        }

        // Fallback: If not found in the local diccionario.json, query Gemini API
        try {
          const client = getGeminiClient();
          const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Define la palabra "${word}" en español. Responde única y exclusivamente con un objeto JSON estructurado con el significado real, sinónimos, antónimos, categoría gramatical y ejemplos prácticos. No agregues explicaciones fuera del JSON.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  category: { type: Type.STRING },
                  meanings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  synonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  antonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  examples: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  found: { type: Type.BOOLEAN }
                },
                required: ["word", "category", "meanings", "synonyms", "antonyms", "examples", "found"]
              }
            }
          });

          if (response.text) {
            const parsedGemini = JSON.parse(response.text);
            res.json(parsedGemini);
            return;
          }
        } catch (geminiError: any) {
          console.warn('Gemini API definition fallback failed:', geminiError.message);
        }

        res.json(searchResult);
      }
    } catch (error: any) {
      console.error('Error en el diccionario local:', error.message);
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
