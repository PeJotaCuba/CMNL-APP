import React, { useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { RadioScript } from '../../types_script';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { parseScriptLocally } from '../../utils/localParser';
import { openWhatsApp } from '../../utils/whatsappUtils';

interface InformeModalProps {
  original: RadioScript | null;
  currentHtml: string;
  originalHtml?: string;
  onClose: () => void;
}

function cleanSegmentText(str: string): string {
  return str
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}

function parseHtmlToSegments(htmlStr: string) {
  if (!htmlStr) return [];
  const parent = document.createElement('div');
  parent.innerHTML = htmlStr;
  
  const segments: { type: 'credito' | 'body'; label: string; text: string }[] = [];
  
  // Find script-credits
  const creditsContainer = parent.querySelector('#script-credits');
  const divsInCredits = creditsContainer ? creditsContainer.querySelectorAll('div') : [];
  
  if (creditsContainer && divsInCredits.length > 0) {
      divsInCredits.forEach(d => {
          const b = d.querySelector('b');
          const label = b ? b.textContent?.replace(/:/g, '').trim() || '' : '';
          
          const clone = d.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('mark.comment-mark').forEach(m => m.replaceWith(m.textContent || ''));
          
          let text = clone.textContent || '';
          if (label && text.startsWith(label)) {
              text = text.substring(label.length).replace(/^:\s*/, '').trim();
          } else {
              text = text.replace(/^:\s*/, '').trim();
          }
          
          segments.push({
              type: 'credito',
              label: label || 'Dato',
              text: cleanSegmentText(text)
          });
      });
  }
  
  // Find script-body
  const bodyContainer = parent.querySelector('#script-body');
  const divsInBody = bodyContainer ? bodyContainer.querySelectorAll('div') : [];
  
  if (bodyContainer && divsInBody.length > 0) {
      divsInBody.forEach((d, idx) => {
          const bElements = d.querySelectorAll('b');
          let prefix = "";
          bElements.forEach(b => {
              prefix += (b.textContent || '') + " ";
          });
          prefix = prefix.trim();
          
          const clone = d.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('mark.comment-mark').forEach(m => m.replaceWith(m.textContent || ''));
          
          let fullText = clone.textContent || '';
          
          segments.push({
              type: 'body',
              label: prefix || `Línea ${idx + 1}`,
              text: cleanSegmentText(fullText)
          });
      });
  }
  
  // Fallback if neither container or divs found
  if (segments.length === 0) {
      const divs = parent.querySelectorAll('div');
      divs.forEach((d, idx) => {
          const b = d.querySelector('b');
          const label = b ? b.textContent?.replace(/:/g, '').trim() || '' : '';
          
          const clone = d.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('mark.comment-mark').forEach(m => m.replaceWith(m.textContent || ''));
          let text = clone.textContent || '';
          
          segments.push({
              type: 'body',
              label: label || `Línea ${idx + 1}`,
              text: cleanSegmentText(text)
          });
      });
  }
  
  return segments;
}

function extractDiffContext(origText: string, currText: string) {
    if (!origText && !currText) return { before: "", after: "" };
    if (!origText) return { before: "", after: currText };
    if (!currText) return { before: origText, after: "" };

    let start = 0;
    while (start < origText.length && start < currText.length && origText[start] === currText[start]) {
        start++;
    }
    
    let endOrig = origText.length - 1;
    let endCurr = currText.length - 1;
    while (endOrig >= start && endCurr >= start && origText[endOrig] === currText[endCurr]) {
        endOrig--;
        endCurr--;
    }
    
    if (start > endOrig && start > endCurr) {
        return { before: "", after: "" };
    }

    let wordStart = start;
    while (wordStart > 0 && !/\s/.test(origText[wordStart - 1])) wordStart--;
    
    let wordEndOrig = endOrig;
    while (wordEndOrig < origText.length - 1 && !/\s/.test(origText[wordEndOrig + 1])) wordEndOrig++;
    
    let wordEndCurr = endCurr;
    while (wordEndCurr < currText.length - 1 && !/\s/.test(currText[wordEndCurr + 1])) wordEndCurr++;

    const before = origText.substring(wordStart, wordEndOrig + 1).trim();
    const after = currText.substring(wordStart, wordEndCurr + 1).trim();

    return { 
        before: before, 
        after: after 
    };
}

export function InformeModal({ original, currentHtml, originalHtml, onClose }: InformeModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!original || !currentHtml) return null;

  const changes: any[] = [];
  const comments: any[] = [];

  // Extract all comments from the HTML
  const div = document.createElement('div');
  div.innerHTML = currentHtml;
  const marks = div.querySelectorAll('mark.comment-mark');
  marks.forEach(m => {
      const text = m.getAttribute('data-comment');
      if (text) {
          // Try to get some context
          let contextLabel = "Contexto general";
          let contextDiv = m.closest('div');
          if (contextDiv) {
             let clone = contextDiv.cloneNode(true) as HTMLElement;
             clone.querySelectorAll('mark.comment-mark').forEach(x => x.replaceWith(x.textContent || ''));
             contextLabel = clone.textContent?.replace(/\s+/g, ' ').substring(0, 50) + "..." || "Párrafo";
          }
          comments.push({
              context: contextLabel,
              selectedText: m.textContent,
              commentText: text
          });
      }
  });

  const getCleanTextForParsing = (html: string) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      temp.querySelectorAll('mark.comment-mark').forEach(m => {
          m.replaceWith(m.textContent || '');
      });
      let htmlStr = temp.innerHTML;
      
      // Preserve markdown representation from HTML formatting
      htmlStr = htmlStr.replace(/<b>(.*?)<\/b>/gi, '*$1*');
      htmlStr = htmlStr.replace(/<strong>(.*?)<\/strong>/gi, '*$1*');
      htmlStr = htmlStr.replace(/<i>(.*?)<\/i>/gi, '*$1*');
      htmlStr = htmlStr.replace(/<em>(.*?)<\/em>/gi, '*$1*');

      htmlStr = htmlStr.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
      htmlStr = htmlStr.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
      htmlStr = htmlStr.replace(/<tr[^>]*>/gi, '').replace(/<\/tr>/gi, '\n');
      htmlStr = htmlStr.replace(/<br\s*[\/]?>/gi, '\n');
      
      return htmlStr
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
  };

  if (originalHtml) {
      const origSegments = parseHtmlToSegments(originalHtml);
      const currSegments = parseHtmlToSegments(currentHtml);
      
      // Diff credits
      const origCredits = origSegments.filter(s => s.type === 'credito');
      const currCredits = currSegments.filter(s => s.type === 'credito');
      
      for (let i = 0; i < Math.max(origCredits.length, currCredits.length); i++) {
          const orig = origCredits[i];
          const curr = currCredits[i];
          
          if (!orig && curr) {
              changes.push({
                  index: 0,
                  type: 'credito',
                  identifier: curr.label,
                  before: '',
                  after: curr.text
              });
          } else if (orig && !curr) {
              changes.push({
                  index: 0,
                  type: 'credito',
                  identifier: orig.label,
                  before: orig.text,
                  after: ''
              });
          } else if (orig && curr) {
              if (orig.text !== curr.text) {
                  const diff = extractDiffContext(orig.text, curr.text);
                  if (diff.before || diff.after) {
                      changes.push({
                          index: 0,
                          type: 'credito',
                          identifier: curr.label,
                          ...diff
                      });
                  }
              }
          }
      }
      
      // Diff body
      const origBody = origSegments.filter(s => s.type === 'body');
      const currBody = currSegments.filter(s => s.type === 'body');
      
      for (let i = 0; i < Math.max(origBody.length, currBody.length); i++) {
          const orig = origBody[i];
          const curr = currBody[i];
          
          if (!orig && curr) {
              changes.push({
                  index: i + 1,
                  type: 'speaker',
                  identifier: curr.label,
                  before: '',
                  after: curr.text
              });
          } else if (orig && !curr) {
              changes.push({
                  index: i + 1,
                  type: 'speaker',
                  identifier: orig.label,
                  before: orig.text,
                  after: ''
              });
          } else if (orig && curr) {
              if (orig.text !== curr.text) {
                  const diff = extractDiffContext(orig.text, curr.text);
                  if (diff.before || diff.after) {
                      let detectedType = 'speaker';
                      if (curr.label.toUpperCase().includes('SON:') || curr.label.toUpperCase().includes('OP:') || 
                          orig.label.toUpperCase().includes('SON:') || orig.label.toUpperCase().includes('OP:')) {
                          detectedType = 'sound';
                      }
                      
                      changes.push({
                          index: i + 1,
                          type: detectedType,
                          identifier: curr.label || orig.label,
                          ...diff
                      });
                  }
              }
          }
      }
  } else {
      // Fallback old diff logic
      const cleanCurrentText = getCleanTextForParsing(currentHtml);
      const current = parseScriptLocally(cleanCurrentText);

      if (current) {
          // Diff Credits
          for (let i = 0; i < Math.min(original.credits.length, current.credits.length); i++) {
             const origC = original.credits[i];
             const currC = current.credits[i];
             if (origC.value !== currC.value) {
                 const diff = extractDiffContext(origC.value, currC.value);
                 if (diff.before || diff.after) {
                     changes.push({
                         index: 0,
                         type: 'credito',
                         identifier: currC.label,
                         ...diff
                     });
                 }
             }
          }
          
          // Diff body
          for (let i = 0; i < Math.min(original.body.length, current.body.length); i++) {
            const origItem = original.body[i];
            const currItem = current.body[i];
            
            // Check paragraphs
            for (let p = 0; p < Math.min((origItem.text || []).length, (currItem.text || []).length); p++) {
               const origText = origItem.text[p];
               const currText = currItem.text[p];
               
               if (origText !== currText) {
                  const diff = extractDiffContext(origText, currText);
                  if (diff.before || diff.after) {
                      changes.push({
                         index: i + 1,
                         type: origItem.type,
                         identifier: origItem.identifier,
                         ...diff
                      });
                  }
               }
            }
          }
      }
  }

  const generateDocxBlob = async () => {
    const children: any[] = [];

    children.push(new Paragraph({
      text: "Informe de Cambios y Comentarios",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    if (comments.length > 0) {
      children.push(new Paragraph({ text: "Comentarios Insertados", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      comments.forEach(c => {
         children.push(new Paragraph({ children: [new TextRun({ text: `Contexto: ${c.context}`, bold: true })], spacing: { before: 200 } }));
         children.push(new Paragraph({ children: [new TextRun({ text: `"${c.selectedText}"`, italics: true })] }));
         children.push(new Paragraph({ text: `Comentario: ${c.commentText}` }));
      });
    }

    if (changes.length > 0) {
      children.push(new Paragraph({ text: "Ediciones al Texto", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      changes.forEach(change => {
         const title = change.type === 'credito' ? `CRÉDITOS: ${change.identifier}` : `Entrada #${change.index} (${change.type === 'speaker' ? 'LOCUTOR' : change.type === 'sound' ? 'SONIDO' : 'TEXTO'}) ${change.identifier ? `- ORDEN: ${change.identifier}` : ''}`;
         children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true })], spacing: { before: 200 } }));
         children.push(new Paragraph({ text: "Original:" }));
         children.push(new Paragraph({ children: [new TextRun({ text: change.before || '(eliminado)', italics: true })] }));
         children.push(new Paragraph({ text: "Editado:" }));
         children.push(new Paragraph({ text: change.after || '(eliminado)' }));
      });
    }

    if (comments.length === 0 && changes.length === 0) {
      children.push(new Paragraph({ text: "No se han detectado cambios ni comentarios en el guion." }));
    }

    const doc = new Document({
      sections: [{ properties: {}, children }]
    });

    return await Packer.toBlob(doc);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateDocxBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "INFORME_GUION.DOCX";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error al generar el informe.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTextReport = () => {
    let report = "*INFORME DE GUION*\n\n";
    
    if (comments.length > 0) {
      report += "*🗣️ COMENTARIOS:*\n";
      comments.forEach(c => {
         report += `• "${c.selectedText}"\n  📝 ${c.commentText}\n\n`;
      });
    }

    if (changes.length > 0) {
      report += "*✍️ EDICIONES:*\n";
      changes.forEach(c => {
         const title = c.type === 'credito' ? `CRÉDITOS: ${c.identifier}` : `Entrada #${c.index} ${c.identifier ? `(${c.identifier})` : ''}`;
         report += `*${title}*\n`;
         report += `❌ ${c.before || '(vacío)'}\n`;
         report += `✅ ${c.after || '(vacío)'}\n\n`;
      });
    }

    if (comments.length === 0 && changes.length === 0) {
      report += "No se registraron cambios ni comentarios.\n";
    }

    return report;
  };

  const handleShare = () => {
    try {
      const textReport = generateTextReport();
      
      if (navigator.canShare && navigator.canShare({ text: "Test", title: "Test" })) {
          // Trying native share API with text only (more reliable)
          navigator.share({
            title: 'Informe de Guion',
            text: textReport
          }).catch(e => {
            console.warn("Navegador canceló share, intentando WhatsApp...", e);
            openWhatsApp(textReport);
          });
      } else {
          openWhatsApp(textReport);
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo compartir.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Informe de Cambios y Comentarios</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
          {comments.length > 0 && (
             <div className="mb-8">
                 <h3 className="text-md font-bold text-slate-700 mb-4 border-b pb-2">Comentarios Insertados</h3>
                 <div className="space-y-4">
                    {comments.map((c, idx) => (
                      <div key={idx} className="bg-white border-l-4 border-yellow-400 p-3 shadow-sm rounded">
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{c.context}</div>
                         <div className="text-sm bg-yellow-50 p-2 italic rounded text-slate-700 mb-2 border border-yellow-100">
                             "{c.selectedText}"
                         </div>
                         <div className="text-sm font-medium text-slate-900">
                             🗨️ {c.commentText}
                         </div>
                      </div>
                    ))}
                 </div>
             </div>
          )}

          {changes.length === 0 && comments.length === 0 ? (
             <p className="text-slate-500 text-center py-8">No se han detectado cambios ni comentarios en el guion.</p>
          ) : changes.length > 0 ? (
             <div>
                 <h3 className="text-md font-bold text-slate-700 mb-4 border-b pb-2">Ediciones al Texto</h3>
                 <div className="space-y-6">
                    {changes.map((change, idx) => (
                      <div key={idx} className="border border-slate-200 rounded p-4 bg-white shadow-sm">
                        <div className="text-xs font-bold text-indigo-600 mb-2 uppercase">
                          {change.type === 'credito' ? `CRÉDITOS: ${change.identifier}` : `Entrada #${change.index} (${change.type === 'speaker' ? 'LOCUTOR' : change.type === 'sound' ? 'SONIDO' : 'TEXTO'}) ${change.identifier ? `- ORDEN: ${change.identifier}` : ''}`}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Original:</div>
                              <div className="text-sm text-slate-600 line-through opacity-70">{change.before || '(vacío)'}</div>
                          </div>
                          <div>
                              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Editado:</div>
                              <div className="text-sm text-slate-800 font-medium">{change.after || '(eliminado)'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
             </div>
          ) : null}
        </div>
        
        <div className="p-4 border-t border-slate-200 flex justify-end space-x-3 bg-white">
          <button 
             onClick={handleDownload} 
             disabled={isGenerating}
             className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm flex items-center hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>DESCARGAR</span>
          </button>
          <button 
             onClick={handleShare} 
             disabled={isGenerating}
             className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm flex items-center hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            <span>COMPARTIR</span>
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded font-bold text-sm hover:bg-slate-300 transition-colors">
            <span>CERRAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
