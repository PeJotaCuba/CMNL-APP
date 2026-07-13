import React, { useState } from 'react';
import { User } from './types';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getStoredPassword, getStoredCertificate, generateDigitalSignature, formatDigitalSignatureForDocuments, checkSigningAuthorization } from '../../utils/signatureUtils';
import { extractTextFromPDF } from './services/pdfService';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

const pdfjs = pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

interface BatchSignerProps {
    currentUser?: User | null;
    onFinish: () => void;
}

interface LoadedPDF {
    id: string;
    file: File;
    name: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    error?: string;
    blob?: Blob;
}

const BatchSigner: React.FC<BatchSignerProps> = ({ currentUser, onFinish }) => {
    const [files, setFiles] = useState<LoadedPDF[]>([]);
    const [signPass, setSignPass] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingSignWarning, setPendingSignWarning] = useState<string | null>(null);
    const [customAlert, setCustomAlert] = useState<string | null>(null);

    const showAlert = (message: string) => {
        setCustomAlert(message);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files).map((file: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            status: 'pending' as const
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const processBatch = async () => {
        if (!currentUser) return;
        if (!signPass) {
            showAlert("Ingrese su contraseña de certificado.");
            return;
        }

        const globalUserId = (currentUser as any).id || currentUser.username;
        const authCheck = checkSigningAuthorization(globalUserId);
        if (!authCheck.authorized) {
            showAlert(authCheck.reason);
            return;
        }
        if (authCheck.warning && !sessionStorage.getItem(`warn_acked_${globalUserId}`)) {
             setPendingSignWarning(authCheck.warning);
             return;
        }

        const storedPass = getStoredPassword(globalUserId);
        const cert = getStoredCertificate(globalUserId);

        if (cert) {
            const issueDate = cert.issueDate ? new Date(cert.issueDate).getTime() : Date.now();
            
        }

        const effectivePass = storedPass || (cert ? cert.originalPassword : '') || '';

        if (!cert || signPass !== effectivePass) {
            showAlert("Contraseña de firma incorrecta.");
            return;
        }

        setIsProcessing(true);
        const signature = generateDigitalSignature(cert);
        const sigLines = formatDigitalSignatureForDocuments(signature);

        const updatedFiles = [...files];

        for (let i = 0; i < updatedFiles.length; i++) {
            const item = updatedFiles[i];
            if (item.status === 'done') continue;

            try {
                item.status = 'processing';
                setFiles([...updatedFiles]);

                // 1. Analyze director in the PDF
                const pdfText = await extractTextFromPDF(item.file);
                const currentUserName = currentUser.fullName || (currentUser as any).name || currentUser.username;
                
                const getLevenshteinSimilarity = (s1: string, s2: string): number => {
                    const len1 = s1.length;
                    const len2 = s2.length;
                    if (len1 === 0) return len2 === 0 ? 1 : 0;
                    if (len2 === 0) return 0;
                    
                    const matrix: number[][] = [];
                    for (let i = 0; i <= len1; i++) {
                        matrix[i] = [i];
                    }
                    for (let j = 0; j <= len2; j++) {
                        matrix[0][j] = j;
                    }
                    
                    for (let i = 1; i <= len1; i++) {
                        for (let j = 1; j <= len2; j++) {
                            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j] + 1,      // deletion
                                matrix[i][j - 1] + 1,      // insertion
                                matrix[i - 1][j - 1] + cost // substitution
                            );
                        }
                    }
                    
                    const distance = matrix[len1][len2];
                    const maxLength = Math.max(len1, len2);
                    return 1 - distance / maxLength;
                };

                const normalizeForCompare = (str: string) => {
                    return str
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "") // remove accents
                        .replace(/[^a-z0-9]/g, " ")     // standard lowercase alphanumeric comparison
                        .replace(/\s+/g, " ")
                        .trim();
                };

                const normalText = normalizeForCompare(pdfText);
                const normalUser = normalizeForCompare(currentUserName);

                // Find "Director:" or "Director(a):" line in the text
                const textLines = pdfText.split('\n');
                const directorLine = textLines.find(l => {
                    const lower = l.toLowerCase();
                    return lower.includes('director') || lower.includes('director(a)');
                });

                let isNameMatch = false;
                let originalDirectorName = 'No especificado';
                let matchPercentage = 0;

                if (directorLine) {
                    const colonIndex = directorLine.indexOf(':');
                    if (colonIndex !== -1) {
                        originalDirectorName = directorLine.substring(colonIndex + 1).trim();
                    } else {
                        originalDirectorName = directorLine
                            .replace(/director\(a\)/gi, '')
                            .replace(/director/gi, '')
                            .trim();
                    }
                    
                    const normalOriginalDir = normalizeForCompare(originalDirectorName);
                    
                    // Direct match
                    const containsCheck = normalOriginalDir.includes(normalUser) || normalUser.includes(normalOriginalDir);
                    
                    // Word overlap ratio
                    const wordsOrig = normalOriginalDir.split(' ').filter(w => w.length > 2);
                    const wordsUser = normalUser.split(' ').filter(w => w.length > 2);
                    const matchingWords = wordsOrig.filter(w => wordsUser.includes(w));
                    const wordRatio = wordsOrig.length > 0 ? (matchingWords.length / Math.max(wordsOrig.length, wordsUser.length)) : 0;
                    
                    // Levenshtein similarity
                    const levSimilarity = getLevenshteinSimilarity(normalOriginalDir, normalUser);
                    
                    matchPercentage = Math.max(levSimilarity, wordRatio) * 100;
                    if (containsCheck) {
                        matchPercentage = 100;
                    }

                    isNameMatch = matchPercentage >= 80 || containsCheck;
                } else {
                    // Fallback to substring in full text
                    const containsCheck = normalText.includes(normalUser);
                    isNameMatch = containsCheck;
                    matchPercentage = containsCheck ? 100 : 0;
                }

                if (!isNameMatch) {
                    const errorMsg = `El director del PDF original (${directorLine ? directorLine.trim() : originalDirectorName}) no coincide con el firmante actual (${currentUserName}). Coincidencia: ${Math.round(matchPercentage)}% (mínimo 80% requerido).`;
                    throw new Error(errorMsg);
                }

                // 2. Load PDF with pdf-lib for painting & edit
                const arrayBuffer = await item.file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                const lastPage = pages[pages.length - 1];
                const { width, height } = lastPage.getSize();

                // 3. Find old signature exact coordinates using pdfjs to draw white rectangles selectively
                const pdfJsDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
                const pdfJsPage = await pdfJsDoc.getPage(pages.length);
                const textContent = await pdfJsPage.getTextContent();
                const textItems = textContent.items as any[];

                const oldSignatureYCoords: number[] = [];
                textItems.forEach((txtItem: any) => {
                    const str = txtItem.str.toUpperCase();
                    // Candidate old signature indicators (FIRMA, DIGITAL, or hash signature patterns)
                    if (str.includes('FIRMA') || str.includes('DIGITAL') || /[A-Z0-9]{4,}-[A-Z0-9]{4,}/.test(str)) {
                        const yCoord = txtItem.transform[5];
                        if (yCoord && !oldSignatureYCoords.includes(yCoord)) {
                            // Filter out elements near the top headers
                            if (yCoord < height - 100) {
                                oldSignatureYCoords.push(yCoord);
                            }
                        }
                    }
                });

                // Cover detected old signature blocks with surgical precision (up to 80pt height)
                oldSignatureYCoords.forEach(yCoord => {
                    lastPage.drawRectangle({
                        x: 15,
                        y: yCoord - 40,
                        width: width - 30,
                        height: 80,
                        color: rgb(1, 1, 1), // White
                    });
                });

                // Also double check a generic middle-bottom area just in case (e.g. from Y=60 to Y=320) if oldSignatureYCoords was empty
                if (oldSignatureYCoords.length === 0) {
                    lastPage.drawRectangle({
                        x: 40,
                        y: 60,
                        width: width - 80,
                        height: 260,
                        color: rgb(1, 1, 1),
                    });
                }

                // 4. Place new signature at the standard beautiful bottom-right position as in pdfService (measured in points inside safe boundaries)
                const courierFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
                
                // standard A4 proportions: lineEndX = width * (190 / 210), lineStartX = width * (110 / 210)
                const lineStartX = (110 / 210) * width;
                const lineEndX = (190 / 210) * width;
                const currentY = 85; // Sitting comfortably above the bottom edge to avoid cuts on page boundary

                // Draw solid right aligned signature line
                lastPage.drawLine({
                    start: { x: lineStartX, y: currentY + 12 },
                    end: { x: lineEndX, y: currentY + 12 },
                    thickness: 0.5,
                    color: rgb(0, 0, 0),
                });

                // Draw digital signature lines right-aligned with monospace Courier precision (each char is approx 4.8 points wide at size 8)
                if (sigLines.length > 0) {
                    const firstLineText = `Firma Digital: ${sigLines[0]}`;
                    const firstLineWidth = firstLineText.length * 4.8;
                    lastPage.drawText(firstLineText, {
                        x: lineEndX - firstLineWidth,
                        y: currentY + 2,
                        size: 8,
                        font: courierFont,
                        color: rgb(0, 0, 0),
                    });

                    if (sigLines[1]) {
                        const secondLineWidth = sigLines[1].length * 4.8;
                        lastPage.drawText(sigLines[1], {
                            x: lineEndX - secondLineWidth,
                            y: currentY - 6,
                            size: 8,
                            font: courierFont,
                            color: rgb(0, 0, 0),
                        });
                    }

                    if (sigLines[2]) {
                        const thirdLineWidth = sigLines[2].length * 4.8;
                        lastPage.drawText(sigLines[2], {
                            x: lineEndX - thirdLineWidth,
                            y: currentY - 14,
                            size: 8,
                            font: courierFont,
                            color: rgb(0, 0, 0),
                        });
                    }

                    if (sigLines[3]) {
                        const fourthLineWidth = sigLines[3].length * 4.8;
                        lastPage.drawText(sigLines[3], {
                            x: lineEndX - fourthLineWidth,
                            y: currentY - 22,
                            size: 8,
                            font: courierFont,
                            color: rgb(0, 0, 0),
                        });
                    }
                }

                const pdfBytes = await pdfDoc.save();
                item.blob = new Blob([pdfBytes], { type: 'application/pdf' });
                item.status = 'done';
            } catch (err: any) {
                console.error(err);
                item.status = 'error';
                item.error = err.message;
            }
            setFiles([...updatedFiles]);
        }

        // Inform user about final results
        const doneCount = updatedFiles.filter(f => f.status === 'done').length;
        const errorCount = updatedFiles.filter(f => f.status === 'error').length;
        const errorDetails = updatedFiles
            .filter(f => f.status === 'error')
            .map(f => `- ${f.name}: ${f.error}`)
            .join('\n');

        if (errorCount === 0 && doneCount > 0) {
            showAlert(`¡Proceso completado con éxito!\n\nSe han firmado digitalmente ${doneCount} de ${doneCount} reportes.\nYa puede proceder a descargar el ZIP con sus archivos.`);
        } else if (errorCount > 0) {
            showAlert(`El proceso de firmas por lote finalizó con inconvenientes:\n\n- Reportes firmados con éxito: ${doneCount}\n- Reportes fallidos: ${errorCount}\n\nDetalles de errores:\n${errorDetails}`);
        } else {
            showAlert("No se firmó ningún reporte. Asegúrese de que correspondan a su usuario director.");
        }

        setIsProcessing(false);
    };

    const downloadZip = async () => {
        const zip = new JSZip();
        files.filter(f => f.status === 'done' && f.blob).forEach(f => {
            zip.file(`FIRMADO_${f.name}`, f.blob!);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Reportes_Firmados_${new Date().toISOString().split('T')[0]}.zip`);
    };

    return (
        <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto">
            <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-4 rounded-xl mb-6">
                <h4 className="font-bold text-[#9E7649] text-sm mb-2">Instrucciones</h4>
                <ul className="text-xs text-[#E8DCCF]/70 list-disc list-inside space-y-1">
                    <li>Seleccione uno o varios archivos PDF de reportes musicales anteriores.</li>
                    <li>Ingrese su contraseña de certificado digital.</li>
                    <li>El sistema procesará los archivos, reemplazando las firmas antiguas por su firma actual.</li>
                    <li>Al finalizar, podrá descargar un paquete ZIP con todos los reportes firmados.</li>
                </ul>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-[#E8DCCF]/40 uppercase tracking-wider mb-2 block font-bold">Cargar PDFs</label>
                        <label className="w-full h-32 border-2 border-dashed border-[#9E7649]/20 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#2C1B15] hover:border-[#9E7649]/40 transition-all group">
                            <span className="material-symbols-outlined text-4xl text-[#9E7649]/40 group-hover:text-[#9E7649]/60 transition-colors">cloud_upload</span>
                            <span className="text-xs text-[#E8DCCF]/60">Seleccionar archivos PDF</span>
                            <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                    <div className="w-64">
                         <label className="text-[10px] text-[#E8DCCF]/40 uppercase tracking-wider mb-2 block font-bold">Contraseña de Certificado</label>
                         <input 
                            type="password" 
                            value={signPass}
                            onChange={(e) => setSignPass(e.target.value)}
                            className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded-xl p-3 text-white text-xs focus:border-yellow-500/50 outline-none transition-colors"
                            placeholder="Ingrese su clave..."
                         />
                    </div>
                </div>

                <div className="bg-[#2C1B15]/50 rounded-2xl border border-[#9E7649]/10 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold text-sm">Archivos en cola ({files.length})</h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={processBatch}
                                disabled={files.length === 0 || isProcessing}
                                className="bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                             >
                                <span className="material-symbols-outlined text-sm">draw</span>
                                Firmar Lote
                             </button>
                             {files.some(f => f.status === 'done') && (
                                <button 
                                    onClick={downloadZip}
                                    className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">folder_zip</span>
                                    Descargar ZIP
                                </button>
                             )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {files.map(file => (
                            <div key={file.id} className="bg-[#1A100C] p-3 rounded-xl border border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                     <div className="min-w-0">
                                        <p className="text-xs text-white truncate font-medium">{file.name}</p>
                                        <p className="text-[10px] text-[#E8DCCF]/40 capitalize">{file.status}</p>
                                     </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {file.status === 'done' && <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>}
                                    {file.status === 'processing' && <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>}
                                    {file.status === 'error' && <span className="material-symbols-outlined text-red-500 text-sm" title={file.error}>error</span>}
                                    <button 
                                        onClick={() => removeFile(file.id)}
                                        className="text-[#E8DCCF]/20 hover:text-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {files.length === 0 && (
                            <p className="text-center py-10 text-[#E8DCCF]/20 text-xs">No hay archivos en cola</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Alert Overlay Modal perfectly aligned and superposed without scroll */}
                        {pendingSignWarning && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 text-center space-y-4 font-sans">
                        <div className="flex justify-center text-[#EAB308]">
                            <span className="material-symbols-outlined text-4xl">warning</span>
                        </div>
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider">Aviso de Seguridad</h3>
                        <p className="text-xs text-stone-200 font-semibold leading-relaxed whitespace-pre-line text-left bg-black/30 p-4 rounded-xl border border-[#9E7649]/10">
                            {pendingSignWarning}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    const globalUserId = (currentUser as any).id || currentUser.username;
                                    sessionStorage.setItem(`warn_acked_${globalUserId}`, 'true');
                                    setPendingSignWarning(null);
                                    processBatch();
                                }}
                                className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold rounded-xl transition-all text-xs uppercase"
                            >
                                Continuar y Firmar
                            </button>
                            <button
                                onClick={() => {
                                    const globalUserId = (currentUser as any).id || currentUser.username;
                                    localStorage.setItem(`cmnl_pass_warn_dismissed_${globalUserId}`, 'true');
                                    sessionStorage.setItem(`warn_acked_${globalUserId}`, 'true');
                                    setPendingSignWarning(null);
                                    processBatch();
                                }}
                                className="w-full py-2 bg-transparent text-stone-400 hover:text-white font-semibold rounded-xl transition-all text-[10px] uppercase underline"
                            >
                                No mostrar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {customAlert && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomAlert(null)}>
                    <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 text-center space-y-4 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center text-[#9E7649]">
                            <span className="material-symbols-outlined text-4xl animate-bounce">verified_user</span>
                        </div>
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider">Centro de Notificaciones</h3>
                        <p className="text-xs text-stone-200 font-semibold leading-relaxed whitespace-pre-line text-left bg-black/30 p-4 rounded-xl border border-[#9E7649]/10">
                            {customAlert}
                        </p>
                        <button
                            onClick={() => setCustomAlert(null)}
                            className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold rounded-xl transition-all text-xs uppercase"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchSigner;
