import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2, Mic, RotateCcw, Sparkles, FileText, Upload, Settings, Printer, Share2, ClipboardList, Trash2, CheckCircle2 } from 'lucide-react';
import { generateDocxFromHtml } from '../utils/docxService';
import { RadioScript } from '../types_script';
import * as mammoth from 'mammoth';
import { parseScriptLocally } from '../utils/localParser';
import { normalizeScriptNumbering } from '../utils/normalizeService';
import { EditorBlock } from './scriptFormat/EditorBlock';
import { EditorToolbar } from './scriptFormat/EditorToolbar';
import { InformeModal } from './scriptFormat/InformeModal';
import CMNLHeader from './CMNLHeader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface DocumentItem {
  id: string;
  originalFileName: string;
  inputText: string;
  scriptData: RadioScript | null;
  originalScriptData: RadioScript | null;
  editorHtml: string;
  externalVersion: number;
  history: string[];
  isDirty: boolean;
}

function replaceMarkdownBold(text: string): string {
    if (!text) return '';
    let res = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    res = res.replace(/\*([^*]+)\*/g, '<b>$1</b>');
    res = res.replace(/\*/g, '');
    return res;
}

function scriptDataToHtml(script: RadioScript, formatMode: 'all' | 'numbering' | 'credits' = 'all'): string {
   let html = '<div id="script-credits" style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">';
   
   if (formatMode === 'all' || formatMode === 'credits') {
       script.credits.forEach(c => {
          let creditLabel = c.label;
          const val = replaceMarkdownBold(c.value);
          if (val && !val.includes('____')) {
             html += `<div style="line-height: normal;"><b>${creditLabel}: </b>${val}</div>`;
          } else {
             html += `<div style="line-height: normal;"><b>${creditLabel}: </b></div>`;
          }
       });
   } else {
       (script.rawCredits || []).forEach(c => {
          html += `<div>${c.label ? c.label + ': ' : ''}${c.value}</div>`;
       });
   }
   
   html += '</div><div id="script-body">';

   if (formatMode === 'credits') {
       script.body.forEach(item => {
          const paragraphs = item.text || [];
          paragraphs.forEach((p, idx) => {
              const val = replaceMarkdownBold(p);
              
              if (idx === 0) {
                 if (item.type === 'speaker') {
                     const prefixId = item.identifier ? `${item.identifier} ` : '';
                     html += `<div>${prefixId}${item.speakerName || 'LOCUTOR'}: ${item.intention ? `(${item.intention}) ` : ''}${val}</div>`;
                 } else if (item.type === 'sound') {
                     const prefixId = item.identifier ? `${item.identifier} ` : '';
                     html += `<div>${prefixId}SON: ${val}</div>`;
                 } else {
                     html += `<div>${val}</div>`;
                 }
              } else {
                  html += `<div>${val}</div>`;
              }
          });
       });
   } else {
       script.body.forEach(item => {
          if (item.type === 'speaker') {
             const paragraphs = item.text || [];
             paragraphs.forEach((p, idx) => {
                const isFirst = idx === 0;
                const indentStyle = isFirst ? '-2cm' : '0';
                let bHtml = `<div style="margin-left: 2cm; text-indent: ${indentStyle};">`;
                if (isFirst) {
                    const prefixId = item.identifier ? `${item.identifier} ` : '';
                    bHtml += `<b>${prefixId}${item.speakerName || 'LOCUTOR'}:</b> `;
                    if (item.intention) {
                        bHtml += `<b>(${item.intention})</b> `;
                    }
                }
                bHtml += `${replaceMarkdownBold(p)}</div>`;
                html += bHtml;
             });
          } else if (item.type === 'sound') {
             const paragraphs = item.text || [];
             paragraphs.forEach((p, idx) => {
                 const isFirst = idx === 0;
                 let cleanText = replaceMarkdownBold(p);
                 const indentStyle = isFirst ? '-2cm' : '0';
                 let bHtml = `<div style="margin-left: 2cm; text-indent: ${indentStyle};">`;
                 if (isFirst) {
                     cleanText = cleanText.replace(/^(?:SON|OP)\s*:?\s*/i, '').trim();
                     bHtml += `<b>${item.identifier} SON:</b> `;
                 }
                 bHtml += `<b><u>${cleanText}</u></b></div>`;
                 html += bHtml;
             });
          } else {
             const paragraphs = item.text || [];
             paragraphs.forEach(p => {
                 html += `<div style="margin-left: 2cm;">${replaceMarkdownBold(p)}</div>`;
             });
          }
       });
   }
   html += '</div>';
   return html;
}

export default function GuionFormatTool({ 
  onBack, 
  currentUser, 
  onMenuClick 
}: { 
  onBack: () => void;
  currentUser?: { name: string; role: string; photo?: string } | null;
  onMenuClick?: () => void;
}) {
  const [docs, setDocs] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('radio_scripts_docs');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('radio_scripts_docs', JSON.stringify(docs));
  }, [docs]);

  const activeDoc = docs.find(d => d.id === activeDocId);
  
  const inputText = activeDoc?.inputText || '';
  const scriptData = activeDoc?.scriptData || null;
  const originalScriptData = activeDoc?.originalScriptData || null;
  const editorHtml = activeDoc?.editorHtml || '';
  const externalVersion = activeDoc?.externalVersion || 0;
  const history = activeDoc?.history || [];
  const isDirty = activeDoc?.isDirty || false;

  const updateActiveDoc = (updates: Partial<DocumentItem>) => {
      setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, ...updates } : d));
  };

  const setInputText = (v: string | ((prev: string) => string)) => {
      const val = typeof v === 'function' ? v(inputText) : v;
      if (!activeDocId) {
          const newId = Date.now().toString();
          const newDoc: DocumentItem = {
              id: newId,
              originalFileName: 'Nuevo Documento',
              inputText: val,
              scriptData: null,
              originalScriptData: null,
              editorHtml: '',
              externalVersion: 0,
              history: [],
              isDirty: false
          };
          setDocs(prev => [...prev, newDoc]);
          setActiveDocId(newId);
          return;
      }
      updateActiveDoc({ inputText: val });
  };
  const setOriginalScriptData = (v: RadioScript | null) => updateActiveDoc({ originalScriptData: v });
  const setEditorHtml = (v: string | ((prev: string) => string)) => updateActiveDoc({ editorHtml: typeof v === 'function' ? v(editorHtml) : v });
  const setExternalVersion = (v: number | ((prev: number) => number)) => updateActiveDoc({ externalVersion: typeof v === 'function' ? v(externalVersion) : v });
  const setHistory = (v: string[] | ((prev: string[]) => string[])) => updateActiveDoc({ history: typeof v === 'function' ? v(history) : v });
  const setIsDirty = (v: boolean) => updateActiveDoc({ isDirty: v });

  const [isProcessing, setIsProcessing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInforme, setShowInforme] = useState(false);
  const [formatMode, setFormatMode] = useState<'all' | 'numbering' | 'credits'>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(prev => {
        const currentStr = editorHtml || '';
        if (prev.length === 0 || prev[prev.length - 1] !== currentStr) {
          return [...prev, currentStr].slice(-50);
        }
        return prev;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [editorHtml]);
  
  const [commentModal, setCommentModal] = useState<{ active: boolean, range: Range | null }>({ active: false, range: null });
  const previewRef = useRef<HTMLElement>(null);
  
  const [isClearingStock, setIsClearingStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'preview' | 'docs'>('input');
  const [layoutMode, setLayoutMode] = useState<'config' | 'edit'>('config');
  
  const [pageSize, setPageSize] = useState<'letter' | 'legal' | 'A4'>('letter');
  const [fontSize, setFontSize] = useState<number>(13);
  const [lineSpacing, setLineSpacing] = useState<number>(1.15);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(6);

  const [selectionStats, setSelectionStats] = useState<{ paragraphs: number, lines: number, words: number, repetitions: number } | null>(null);
  const [replaceModal, setReplaceModal] = useState<{ active: boolean, text: string, replaceWidth: string, isPattern: boolean }>({ active: false, text: "", replaceWidth: "", isPattern: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

  useEffect(() => {
     const previewEl = previewRef.current;
     if (!previewEl) return;

     let timeoutId: number;

     const handlePointerEvent = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement;
        const mark = target.closest('mark.comment-mark');
        if (mark) {
           const comment = mark.getAttribute('data-comment');
           if (comment) {
               const rect = mark.getBoundingClientRect();
               setActiveTooltip({ 
                  x: rect.left + rect.width / 2, 
                  y: rect.bottom + window.scrollY, 
                  text: comment 
               });
               
               if (e.type === 'mouseover') {
                   clearTimeout(timeoutId);
                   mark.addEventListener('mouseleave', () => {
                       timeoutId = window.setTimeout(() => setActiveTooltip(null), 300);
                   }, { once: true });
               }
           }
        } else if (e.type === 'click') {
           setActiveTooltip(null);
        }
     };

     previewEl.addEventListener('click', handlePointerEvent);
     previewEl.addEventListener('mouseover', handlePointerEvent);
     
     return () => {
        previewEl.removeEventListener('click', handlePointerEvent);
        previewEl.removeEventListener('mouseover', handlePointerEvent);
     };
  }, [editorHtml, activeTab]);

  const handleSave = () => {
    setIsDirty(false);
  };

  const handleRevert = () => {
    if (history.length === 0) return;

    const currentSavedState = history[history.length - 1];
    
    if (editorHtml !== currentSavedState) {
        setEditorHtml(currentSavedState);
        setExternalVersion(externalVersion + 1);
        setIsDirty(true);
        return;
    }

    if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop();
        const prevState = newHistory[newHistory.length - 1];
        setEditorHtml(prevState);
        setExternalVersion(externalVersion + 1);
        setHistory(newHistory);
        setIsDirty(true);
    }
  };

  const requireSaveBeforeAction = (action: () => void) => {
    if (isDirty) handleSave();
    setTimeout(action, 0); 
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const processScriptText = async (textToProcess: string, docId?: string) => {
    if (!textToProcess.trim()) return;
    setIsProcessing(true);
    setError(null);

    const targetDocId = docId || activeDocId;

    try {
      const localParsedData = parseScriptLocally(textToProcess);
      
      if (localParsedData) {
          const normalized = normalizeScriptNumbering(localParsedData, formatMode);
          const newHtml = scriptDataToHtml(normalized, formatMode);
          
          const autoName = getFileName(normalized).replace('.DOCX', '');

          setDocs(prev => prev.map(d => d.id === targetDocId ? {
              ...d,
              originalFileName: d.originalFileName === 'Nuevo Documento' ? autoName : d.originalFileName,
              scriptData: normalized,
              originalScriptData: JSON.parse(JSON.stringify(normalized)),
              editorHtml: newHtml,
              history: [newHtml],
              externalVersion: d.externalVersion + 1,
              inputText: textToProcess
          } : d));

          if (targetDocId === activeDocId) {
             if (window.innerWidth < 768) {
                setActiveTab('preview');
             }
             setTimeout(() => {
                if (scrollContainerRef.current) {
                   scrollContainerRef.current.scrollTop = 0;
                   scrollContainerRef.current.focus();
                }
             }, 300);
          }
      } else {
          throw new Error("No se pudo extraer el contenido.");
      }
    } catch (err: any) {
      console.error(err);
      if (targetDocId === activeDocId) setError(err?.message || "Ocurrió un error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    await processScriptText(inputText);
  };

  const handleClear = () => {
    setActiveDocId(null);
    setError(null);
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(docs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    saveAs(blob, `Respaldo_Guiones_${new Date().toISOString().slice(0,10)}.json`);
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          setDocs(prev => [...prev, ...imported]);
          setError(null);
          if (imported.length > 0) setActiveDocId(imported[imported.length - 1].id);
        }
      } catch (err) {
        setError("Error al importar el respaldo.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    if (!files.length) return;

    setError(null);
    setIsProcessing(true);

    try {
        const newDocs: DocumentItem[] = [];
        
        for (const file of files) {
            let extractedText = '';

            if (file.name.toLowerCase().endsWith('.txt')) {
                 extractedText = await file.text();
            } else {
                 const arrayBuffer = await file.arrayBuffer();
                 const result = await mammoth.convertToHtml({ arrayBuffer });
                 let html = result.value;
                 html = html.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
                 html = html.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
                 html = html.replace(/<tr[^>]*>/gi, '').replace(/<\/tr>/gi, '\n');
                 html = html.replace(/<br\s*[\/]?>/gi, '\n');
                 extractedText = html
                     .replace(/&nbsp;/g, ' ')
                     .replace(/&amp;/g, '&')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/<(?!(\/)?(b|strong|i|em|u|span)\b)[^>]+>/gi, '') 
                     .replace(/ +/g, ' ')
                     .trim();
            }

            if (extractedText.length >= 20) {
               const newId = Date.now().toString() + Math.random().toString();
               newDocs.push({
                   id: newId,
                   originalFileName: file.name,
                   inputText: extractedText,
                   scriptData: null,
                   originalScriptData: null,
                   editorHtml: '',
                   externalVersion: 0,
                   history: [],
                   isDirty: false
               });
            }
        }
        
        if (newDocs.length === 0) throw new Error("No se encontró texto.");
        
        setDocs(prev => [...prev, ...newDocs]);
        
        let firstActiveId = activeDocId;
        if (!activeDocId || files.length > 0) {
            firstActiveId = newDocs[0].id;
            setActiveDocId(newDocs[0].id);
        }
        
        for (const doc of newDocs) {
            await processScriptText(doc.inputText, doc.id);
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
        setError(err.message || "Error al leer el archivo.");
    } finally {
        setIsProcessing(false);
    }
  };

  const getFileName = (script: RadioScript | null) => {
    if (!script) return 'GUION_FORMATEADO.DOCX';
    
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

    const progCredit = script.credits.find(c => c.label.toUpperCase().includes('PROGRAMA'));
    const programa = stripHtml(progCredit?.value || '');
    
    const fechaMatches = script.credits.filter(c => c.label.toUpperCase().includes('FECHA'));
    const fechaCredit = fechaMatches.find(c => {
        const val = stripHtml(c.value);
        return val && !val.includes('____');
    }) || fechaMatches[0];
    
    const fechaRaw = stripHtml(fechaCredit?.value || '');
    
    let fileName = 'GUION';
    if (programa && !programa.includes('____')) {
      fileName = programa.toUpperCase();
    }

    if (fechaRaw && !fechaRaw.includes('____')) {
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const fullMonths = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

        let day = '';
        let month = '';
        let year = '';

        const numbers = fechaRaw.match(/\d+/g);
        if (numbers) {
            if (numbers[0]) day = numbers[0];
            const possibleYear = numbers.find(n => n.length === 4);
            if (possibleYear) year = possibleYear;
        }

        const upperFecha = fechaRaw.toUpperCase();
        for (let i = 0; i < fullMonths.length; i++) {
            if (upperFecha.includes(fullMonths[i])) {
                month = months[i];
                break;
            }
        }

        if (day && month && year) {
            fileName += ` ${day} ${month} ${year}`;
        } else if (day && month) {
             fileName += ` ${day} ${month}`;
        } else {
            const cleaned = fechaRaw.toUpperCase()
                .replace(/\bDE\b/g, '')
                .replace(/\bDEL\b/g, '')
                .replace(/[\\/-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            fileName += ` ${cleaned}`;
        }
    }

    if (script.isMonologo) {
        fileName = 'MONOLOGO ' + fileName;
    }
    
    return `${fileName.replace(/\s+/g, ' ').trim()}.DOCX`;
  };

  const handleDownload = async () => {
    if (!editorHtml) return;
    try {
      const blob = await generateDocxFromHtml(editorHtml, { fontSize, lineSpacing, paragraphSpacing, pageSize });
      const url = URL.createObjectURL(blob);
      const fileName = getFileName(scriptData);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Error al crear el archivo Word.");
    }
  };

  const handleDownloadAll = async () => {
    if (docs.length === 0) return;
    setIsProcessing(true);
    try {
      if (docs.length === 1) {
          await handleDownload();
          setIsProcessing(false);
          return;
      }
      const zip = new JSZip();
      const namesUsed = new Set<string>();
      
      for (const doc of docs) {
         if (!doc.editorHtml) continue;
         const blob = await generateDocxFromHtml(doc.editorHtml, { fontSize, lineSpacing, paragraphSpacing, pageSize });
         const resolvedFileName = getFileName(doc.scriptData);
         
         let uniqueName = resolvedFileName;
         let counter = 1;
         const baseNameNoExt = resolvedFileName.replace(/\.DOCX$/i, '').trim();
         
         while (namesUsed.has(uniqueName.toUpperCase())) {
             uniqueName = `${baseNameNoExt} (${counter++}).DOCX`;
         }
         namesUsed.add(uniqueName.toUpperCase());
         zip.file(uniqueName, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'Guiones_Formateados.zip');
    } catch (err) {
      setError("Error al crear el archivo ZIP.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText || selectedText.length === 0) {
      setSelectionStats(null);
      return;
    }

    const paragraphs = selectedText.split(/\n+/).filter(p => p.trim().length > 0).length;
    const wordsArr = selectedText.split(/\s+/).filter(w => w.length > 0);
    const words = wordsArr.length;
    const lineBreaks = selectedText.split('\n').length;
    const lines = Math.max(lineBreaks, Math.ceil(selectedText.length / 80));

    let repetitions = 0;
    if (scriptData) {
        const fullText = scriptData.body.map(item => item.text.join(' ')).join(' ');
        const escapedSelection = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSelection, 'gi');
        const matches = fullText.match(regex);
        repetitions = matches ? matches.length : 0;
    }

    setSelectionStats({ paragraphs, lines, words, repetitions });
  };

  const handleOpenReplace = () => {
       const selection = window.getSelection();
       const selectedText = selection?.toString().trim() || "";
       let isPattern = false;
       if (/^\[.*?\]$/.test(selectedText) || /^\(.*?(\d+)?.*?\)$/.test(selectedText)) {
           isPattern = true;
       }
       setReplaceModal({ active: true, text: selectedText, replaceWidth: "", isPattern });
  };

  const handleReplaceAll = (forceReplacement?: string) => {
       if (!replaceModal.text || !editorHtml) return;
       const { text, isPattern } = replaceModal;
       const rep = forceReplacement !== undefined ? forceReplacement : replaceModal.replaceWidth;

       let regex: RegExp;
       if (isPattern) {
          if (text.startsWith('(')) {
              const prefixMatch = text.match(/^\((.*?)\d+/);
              if (prefixMatch && prefixMatch[1]) {
                  const safePrefix = prefixMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  regex = new RegExp(`\\(${safePrefix}\\d+[^)]*\\)`, 'g');
              } else {
                  regex = /\([^)]*\)/g;
              }
          } else {
              const match = text.match(/^\[(.*?)(\s+\d+)?\]$/);
              if (match) {
                  const baseWord = match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  regex = new RegExp(`\\[\\s*${baseWord}\\s*(\\d+)?\\s*\\]`, 'gi');
              } else {
                  regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              }
          }
       } else {
          regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
       }

       const newHtml = editorHtml.replace(regex, rep);
       setEditorHtml(newHtml);
       setExternalVersion(externalVersion + 1);
       
       setReplaceModal({ active: false, text: "", replaceWidth: "", isPattern: false });
       setIsDirty(true);
  };

  const handleAddComment = () => {
     const selection = window.getSelection();
     if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
     setCommentModal({ active: true, range: selection.getRangeAt(0).cloneRange() });
  };

  const handleConfirmComment = (text: string) => {
     if (commentModal.range && text.trim()) {
         const selection = window.getSelection();
         selection?.removeAllRanges();
         selection?.addRange(commentModal.range);

         const safeText = text.replace(/"/g, '&quot;');

         try {
             const range = commentModal.range;
             const markEl = document.createElement('mark');
             markEl.className = "bg-yellow-200 cursor-help comment-mark rounded px-1 text-black";
             markEl.setAttribute('data-comment', safeText);

             const frag = range.extractContents();
             markEl.appendChild(frag);
             range.insertNode(markEl);

             selection?.removeAllRanges();
             const newRange = document.createRange();
             newRange.selectNodeContents(markEl);
             selection?.addRange(newRange);

             const editorEl = document.querySelector('[contenteditable="true"]');
             if (editorEl) {
                 const newHtml = editorEl.innerHTML;
                 setEditorHtml(newHtml);
                 setHistory(prev => {
                     const last = prev[prev.length - 1];
                     if (last !== newHtml) {
                         return [...prev, newHtml].slice(-50);
                     }
                     return prev;
                 });
             }
         } catch (e) {
             console.warn("Fallo inserción nativa de comentario, reintentando con fallback:", e);
             try {
                 const frag = commentModal.range.cloneContents();
                 const div = document.createElement('div');
                 div.appendChild(frag);
                 const inner = div.innerHTML;

                 document.execCommand('insertHTML', false, `<mark class="bg-yellow-200 cursor-help comment-mark rounded px-1 text-black" data-comment="${safeText}">${inner}</mark>`);

                 const editorEl = document.querySelector('[contenteditable="true"]');
                 if (editorEl) {
                     const newHtml = editorEl.innerHTML;
                     setEditorHtml(newHtml);
                     setHistory(prev => {
                         const last = prev[prev.length - 1];
                         if (last !== newHtml) {
                             return [...prev, newHtml].slice(-50);
                         }
                         return prev;
                     });
                 }
             } catch (err) {
                 console.error("Fallo definitivo insertando comentario:", err);
             }
         }
         setIsDirty(true);
     }
     setCommentModal({ active: false, range: null });
  };

  return (
    <div className="bg-[#1A0F0A] flex flex-col flex-1 h-full overflow-hidden text-[#E8DCCF] font-sans">
      <CMNLHeader 
        user={currentUser || null}
        sectionTitle="Formato de Guion" 
        onBack={onBack}
        onMenuClick={onMenuClick}
      >
        <div className="flex items-center gap-3">
          {scriptData && (
            <>
              <span className="hidden xl:inline text-[9px] font-semibold text-[#9E7649] uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded border border-[#9E7649]/20 truncate max-w-[200px]">
                  {getFileName(scriptData)}
              </span>
              
              <div className="flex gap-2">
                  <button 
                    onClick={() => requireSaveBeforeAction(handleDownload)}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                    <span className="hidden md:inline">DESC.</span>
                  </button>
                  {docs.length > 1 && (
                    <button 
                      onClick={() => requireSaveBeforeAction(handleDownloadAll)}
                      className="bg-blue-800/30 hover:bg-blue-800/50 text-blue-300 border border-blue-700/30 px-3 py-1.5 rounded font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                      <span className="hidden xl:inline">ZIP</span>
                    </button>
                  )}
                  <button 
                    onClick={() => requireSaveBeforeAction(() => window.print())}
                    className="bg-stone-700/50 hover:bg-stone-600/50 text-stone-300 border border-stone-600/30 px-3 py-1.5 rounded font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-sm transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                    <span className="hidden md:inline">IMPR.</span>
                  </button>
                  <button 
                    onClick={() => requireSaveBeforeAction(() => window.open(`https://wa.me/?text=${encodeURIComponent('Revisa el guion generado en la plataforma de GuionFormat.')}`, '_blank'))}
                    className="bg-green-700/30 hover:bg-green-600/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-sm transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                    <span className="hidden md:inline">COMP.</span>
                  </button>
                  <button 
                    onClick={() => requireSaveBeforeAction(() => setShowInforme(true))}
                    className="bg-amber-700/30 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-sm transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5 sm:mr-1 shrink-0" />
                    <span className="hidden lg:inline">INFORME</span>
                  </button>
              </div>
            </>
          )}
        </div>
      </CMNLHeader>

      <div className="hidden md:flex bg-[#1A0F0A] border-b border-stone-800 p-2 shrink-0 space-x-2 z-20">
        <button onClick={() => setLayoutMode('config')} className={`px-4 py-2 text-xs font-bold uppercase rounded transition-colors ${layoutMode === 'config' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'}`}>Entrada & Configuración</button>
        <button onClick={() => setLayoutMode('edit')} className={`px-4 py-2 text-xs font-bold uppercase rounded transition-colors ${layoutMode === 'edit' ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'}`}>Editar Docx</button>
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-[#2A1810]">
        
        {/* Mobile Tabs */}
        <div className="md:hidden flex bg-[#1A0F0A] border-b border-stone-800 p-2 shrink-0 space-x-2 z-20">
          <button className={`flex-1 py-3 text-xs font-bold uppercase rounded ${activeTab === 'input' ? 'bg-blue-600' : 'bg-stone-800 text-stone-400'}`} onClick={() => setActiveTab('input')}>Entrada</button>
          <button className={`flex-1 py-3 text-xs font-bold uppercase rounded ${activeTab === 'preview' ? 'bg-blue-600' : 'bg-stone-800 text-stone-400'}`} onClick={() => setActiveTab('preview')}>Previa</button>
          <button className={`flex-1 py-3 text-xs font-bold uppercase rounded ${activeTab === 'docs' ? 'bg-blue-600' : 'bg-stone-800 text-stone-400'}`} onClick={() => setActiveTab('docs')}>Docs</button>
        </div>

        {/* Input Area */}
        <section className={`w-full md:w-[28%] md:min-w-[280px] md:max-w-[360px] border-b md:border-b-0 md:border-r border-stone-800 bg-[#2A1810] flex-col z-10 overflow-hidden ${activeTab === 'input' ? 'flex' : (layoutMode === 'config' ? 'hidden md:flex' : 'hidden')}`}>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between shrink-0">
                <div className="w-full">
                    <input type="file" multiple accept=".docx,.txt" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="docx-upload" />
                    <label htmlFor="docx-upload" className="cursor-pointer w-full bg-[#1A0F0A] border border-dashed border-stone-700 hover:border-blue-500 hover:bg-stone-900/50 text-stone-400 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex flex-row items-center justify-center gap-3 transition-all group">
                      <Upload className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-center">Cargar Documentos (.docx, .txt)</span>
                    </label>
                </div>
            </div>

            {error && <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg text-xs font-medium shrink-0">{error}</div>}
            
            <div className="flex-1 flex flex-col min-h-[150px]">
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Texto a Formatear</label>
                <button onClick={handleClear} className="text-blue-400 hover:text-blue-300 flex items-center transition-colors text-[10px] font-bold uppercase tracking-wider">
                  <RotateCcw className="w-3 h-3 mr-1" /> REINICIAR
                </button>
              </div>
              <textarea 
                className="flex-1 w-full bg-[#1A0F0A] border border-stone-800 rounded-xl p-4 text-sm font-mono focus:ring-1 focus:ring-blue-500 text-stone-300 focus:outline-none resize-none" 
                placeholder="Pegue aquí el texto original o cargue un archivo .docx..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="bg-[#1A0F0A] p-4 border border-stone-800 rounded-lg space-y-4">
                <div className="flex items-center space-x-2 text-stone-400 mb-2 border-b border-stone-800 pb-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ajustes</span>
                </div>
                
                <div className="space-y-1 mb-4">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Formato</label>
                    <div className="flex flex-col gap-2 text-sm text-stone-400">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="formatMode" value="all" checked={formatMode === 'all'} onChange={() => setFormatMode('all')} className="text-blue-600 focus:ring-blue-500 bg-stone-900 border-stone-700" />
                            <span>Todos los cambios</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="formatMode" value="numbering" checked={formatMode === 'numbering'} onChange={() => setFormatMode('numbering')} className="text-blue-600 focus:ring-blue-500 bg-stone-900 border-stone-700" />
                            <span>Numeración</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="formatMode" value="credits" checked={formatMode === 'credits'} onChange={() => setFormatMode('credits')} className="text-blue-600 focus:ring-blue-500 bg-stone-900 border-stone-700" />
                            <span>Solo Créditos</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Letra</label>
                        <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full bg-[#2A1810] border border-stone-800 rounded px-2 py-1.5 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value={12}>12 pt</option><option value={13}>13 pt</option><option value={14}>14 pt</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Interlineado</label>
                        <select value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))} className="w-full bg-[#2A1810] border border-stone-800 rounded px-2 py-1.5 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value={1}>1.0</option><option value={1.15}>1.15</option><option value={1.5}>1.5</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Espacios</label>
                        <select value={paragraphSpacing} onChange={(e) => setParagraphSpacing(Number(e.target.value))} className="w-full bg-[#2A1810] border border-stone-800 rounded px-2 py-1.5 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value={3}>3 pt</option><option value={6}>6 pt</option><option value={10}>10 pt</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Tipo de Hoja</label>
                        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as 'letter' | 'legal' | 'A4')} className="w-full bg-[#2A1810] border border-stone-800 rounded px-2 py-1.5 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="letter">Carta</option>
                            <option value="legal">Oficio</option>
                            <option value="A4">A4</option>
                        </select>
                    </div>
                </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isProcessing || !inputText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center transition-all disabled:opacity-50 shrink-0 mb-4 uppercase"
            >
              {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /><span>Generando...</span></> : <><Sparkles className="w-5 h-5 mr-2" /><span>Generar Formato</span></>}
            </button>
          </div>
        </section>

        {/* Preview Area */}
        <section ref={previewRef} className={`flex-1 flex flex-col relative overflow-hidden bg-stone-900 min-h-0 ${activeTab === 'preview' ? 'flex' : 'hidden md:flex'}`}>
          {scriptData && <EditorToolbar onAddComment={handleAddComment} onSave={handleSave} onRevert={handleRevert} onReplace={handleOpenReplace} isDirty={isDirty} />}
          <div 
            ref={scrollContainerRef}
            tabIndex={0}
            className="flex-1 overflow-y-auto w-full flex flex-col items-center bg-stone-800 relative py-12 pb-64 focus:outline-none"
            onMouseUp={handleSelection} onKeyUp={handleSelection}
          >
            {(originalScriptData || editorHtml !== '') ? (
                <div 
                  className={`w-full h-auto bg-white text-black shadow-2xl relative mb-12 flex flex-col shrink-0 ${
                    pageSize === 'legal' ? 'max-w-[21.59cm] min-h-[35.56cm]' : 
                    pageSize === 'A4' ? 'max-w-[21.0cm] min-h-[29.7cm]' : 
                    'max-w-[21.59cm] min-h-[27.94cm]'
                  }`}
                >
                     <EditorBlock 
                        key={activeDocId || 'none'}
                        className="p-8 sm:p-[1.5cm] sm:pt-[2cm] sm:pb-[2.5cm] flex-1 min-h-full block w-full outline-none focus:outline-none focus:ring-0"
                        html={editorHtml}
                        externalVersion={externalVersion}
                        onChange={(html) => { setEditorHtml(html); setIsDirty(true); }}
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: `${fontSize}pt`, lineHeight: lineSpacing }}
                     />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-500 p-8 text-center max-w-sm">
                    <div className="bg-stone-900 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                        <Sparkles className="w-12 h-12 text-stone-600" />
                    </div>
                    <h3 className="font-bold uppercase tracking-widest mb-2">Editor Radiofónico</h3>
                    <p className="text-sm">Pegue texto o cargue archivos y presione Generar Formato.</p>
                </div>
            )}
          </div>
        </section>

        {/* Document List Sidebar */}
        <section className={`w-full md:w-[22%] md:min-w-[240px] md:max-w-[300px] border-l border-stone-800 bg-[#2A1810] flex-col z-10 overflow-hidden ${activeTab === 'docs' ? 'flex' : (layoutMode === 'config' ? 'hidden md:flex' : 'hidden')}`}>
            <div className="p-4 border-b border-stone-800 bg-[#1A0F0A] flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Documentos ({docs.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                {docs.length === 0 ? (
                    <div className="text-center text-stone-600 p-4 text-xs font-medium border border-dashed border-stone-700 rounded-lg m-2">
                        No hay documentos cargados.
                    </div>
                ) : docs.map(doc => {
                    const isDocx = doc.originalFileName.toLowerCase().endsWith('.docx') || doc.originalFileName.toLowerCase().endsWith('.doc');
                    return (
                        <div 
                            key={doc.id}
                            onClick={() => { setActiveDocId(doc.id); if (window.innerWidth < 768) setActiveTab('preview'); }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 relative overflow-hidden group ${activeDocId === doc.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#1A0F0A] border-stone-800 hover:border-stone-600'}`}
                        >
                            <div className={`p-2 rounded shrink-0 ${activeDocId === doc.id ? 'bg-blue-900/40 text-blue-400' : 'bg-stone-900 text-stone-500'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <p className={`text-xs font-bold truncate ${activeDocId === doc.id ? 'text-blue-300' : 'text-stone-300'}`}>{doc.originalFileName}</p>
                                <p className="text-[10px] text-stone-500 truncate mt-0.5">{isDocx ? 'Documento Word' : 'Archivo de Texto'}</p>
                            </div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setDocs(prev => prev.filter(d => d.id !== doc.id)); if (activeDocId === doc.id) setActiveDocId(null); }} className="p-1.5 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                {activeDocId === doc.id && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                                {doc.isDirty && activeDocId !== doc.id && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {docs.length > 0 && (
                <div className="p-2 border-t border-stone-800 bg-[#1A0F0A] flex flex-col gap-1.5 shrink-0">
                    <div className="flex gap-1.5">
                         <button onClick={handleExportBackup} className="flex-1 bg-[#2A1810] hover:bg-stone-800 text-stone-300 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center transition-colors border border-stone-700">
                            <Download className="w-3 h-3 mr-1" /> <span>RESPALDO</span>
                        </button>
                        <label className="flex-1 bg-[#2A1810] hover:bg-stone-800 text-stone-300 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center transition-colors border border-stone-700 cursor-pointer">
                            <Upload className="w-3 h-3 mr-1" /> <span>CARGAR</span>
                            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                        </label>
                    </div>
                    <button 
                        onClick={() => {
                            if (isClearingStock) {
                                setDocs([]);
                                setActiveDocId(null);
                                setIsClearingStock(false);
                            } else {
                                setIsClearingStock(true);
                                setTimeout(() => setIsClearingStock(false), 3000);
                            }
                        }}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center transition-all border ${
                            isClearingStock 
                            ? 'bg-red-900/60 text-red-100 border-red-500/50 animate-pulse' 
                            : 'bg-[#2A1810] hover:bg-red-900/20 hover:text-red-400 text-stone-400 border-stone-800 hover:border-red-900/50'
                        }`}
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 
                        <span>{isClearingStock ? '¿SEGURO? CLIC DE NUEVO' : 'LIMPIAR STOCK'}</span>
                    </button>
                </div>
            )}
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-[#1A0F0A] border-t border-stone-800 text-stone-400 py-1 px-4 flex justify-between items-center text-[9px] font-mono shrink-0 z-20">
        <div className="flex space-x-6 overflow-x-auto whitespace-nowrap hide-scrollbar flex-1">
          {selectionStats ? (
            <div className="flex space-x-6 text-blue-300 font-bold items-center leading-none">
               <span className="text-white bg-blue-600 px-1.5 py-0.5 rounded text-[8px]">SELECCIÓN</span>
               <span>{selectionStats.paragraphs} PÁRRAFOS</span>
               <span>{selectionStats.lines} LÍNEAS</span>
               <span>{selectionStats.words} PALABRAS</span>
               {selectionStats.words > 0 && selectionStats.words < 10 && <span className="text-amber-400">REPETICIONES: {selectionStats.repetitions}</span>}
            </div>
          ) : (
            <div className="flex items-center space-x-2 leading-none">
                <div className="w-1.5 h-1.5 bg-stone-600 rounded-full animate-pulse"></div>
                <span className="italic text-stone-500">Formato de Guion - Radio Ciudad Monumento</span>
            </div>
          )}
        </div>
      </footer>

      {showInforme && <InformeModal original={originalScriptData} currentHtml={editorHtml} originalHtml={activeDoc?.history?.[0] || ""} onClose={() => setShowInforme(false)} />}
      
      {isProcessing && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#2A1810] rounded-xl shadow-2xl p-8 flex flex-col items-center border border-stone-700">
               <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
               <h3 className="text-lg font-bold text-white">Procesando Documento</h3>
               <p className="text-sm text-stone-400 mt-2">Analizando y aplicando formato...</p>
            </div>
         </div>
      )}

      {commentModal.active && (
         <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
           <div className="bg-[#2A1810] rounded-lg shadow-xl w-full max-w-sm p-4 border border-stone-700">
              <h3 className="text-sm font-bold text-white mb-2">Comentario</h3>
              <textarea 
                 autoFocus
                 className="w-full text-sm p-2 bg-[#1A0F0A] border border-stone-700 rounded text-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                 placeholder="Escriba aquí..."
                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmComment(e.currentTarget.value); } }}
              />
              <div className="flex justify-end gap-2 mt-3">
                 <button onClick={() => setCommentModal({ active: false, range: null })} className="px-3 py-1.5 text-xs font-bold text-stone-400 hover:text-white">CANCELAR</button>
                 <button onClick={(e) => { const ta = e.currentTarget.parentElement?.parentElement?.querySelector('textarea'); if(ta) handleConfirmComment(ta.value); }} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded">OK</button>
              </div>
           </div>
         </div>
      )}

      {activeTooltip && (
          <div className="fixed z-[100] bg-stone-800 text-white px-3 py-2 text-xs rounded shadow-xl border border-stone-700" style={{ left: activeTooltip.x, top: activeTooltip.y+8, transform: 'translateX(-50%)' }}>
            {activeTooltip.text}
          </div>
      )}

      {replaceModal.active && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
             <div className="bg-[#2A1810] rounded-lg shadow-xl w-full max-w-sm p-4 border border-stone-700">
               <h3 className="text-sm font-bold text-white mb-4">Reemplazar {replaceModal.isPattern ? '(Patrón)' : '(Texto Exacto)'}</h3>
               <div className="space-y-4">
                   <input type="text" value={replaceModal.text} onChange={e => setReplaceModal({...replaceModal, text: e.target.value})} className="w-full text-sm p-2 bg-[#1A0F0A] text-stone-300 border border-stone-700 rounded focus:outline-none" />
                   <input type="text" value={replaceModal.replaceWidth} onChange={e => setReplaceModal({...replaceModal, replaceWidth: e.target.value})} placeholder="Reemplazo..." className="w-full text-sm p-2 bg-[#1A0F0A] text-stone-300 border border-stone-700 rounded focus:outline-none" />
                   <div className="flex gap-2">
                        <button onClick={() => handleReplaceAll("")} className="flex-1 py-2 text-xs bg-red-900/40 text-red-400 border border-red-500/30 rounded font-bold uppercase hover:bg-red-900/60">Borrar</button>
                        <button onClick={() => handleReplaceAll()} className="flex-1 py-2 text-xs bg-blue-600 text-white rounded font-bold uppercase hover:bg-blue-700">Reemplazar</button>
                   </div>
               </div>
             </div>
          </div>
      )}
    </div>
  );
}
