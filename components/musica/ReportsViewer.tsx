import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { Report, User } from './types';
import { loadReportsFromDB, deleteReportFromDB, updateReportStatus, clearReportsDB, saveReportToDB } from './services/db';
import { openWhatsApp } from '../../utils/whatsappUtils';
import { generateReportPDF } from './services/pdfService';
import { getStoredPassword, getStoredCertificate, generateDigitalSignature, checkSigningAuthorization } from '../../utils/signatureUtils';
import BatchSigner from './BatchSigner';

interface ReportsViewerProps {
    users?: User[]; 
    onEdit: (report: Report) => void;
    currentUser?: User | null;
    refreshTrigger?: number;
}

const ReportsViewer: React.FC<ReportsViewerProps> = ({ users = [], onEdit, currentUser, refreshTrigger = 0 }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSummary, setShowSummary] = useState(false);
    const [showBatchSigner, setShowBatchSigner] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // View mode: 'active' (Pantalla principal) vs 'archive' (Archivo organizado por meses)
    const [viewMode, setViewMode] = useState<'active' | 'archive'>('active');
    const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
    const [consultingReport, setConsultingReport] = useState<Report | null>(null);

    // ZIP Generation modal state
    const [showZipModal, setShowZipModal] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);
    const [zipStatusText, setZipStatusText] = useState('');
    const [generatedZip, setGeneratedZip] = useState<{
        blob: Blob;
        file: File;
        fileName: string;
        count: number;
        fileSizeStr: string;
    } | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || navigator.vendor || (window as any).opera || '') : '';
            const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
            const isIPadOS = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
            setIsMobile(isMobileUA || isIPadOS);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prompt for concluded months reports on entering Reportes
    const [showConcludedPrompt, setShowConcludedPrompt] = useState(false);

    // Prompt for archiving reports after ZIP download or WhatsApp send
    const [showPostZipArchivePrompt, setShowPostZipArchivePrompt] = useState<{
        show: boolean;
        reportsToArchive: Report[];
        message: string;
    }>({ show: false, reportsToArchive: [], message: '' });

    // Signing state
    const [signingReport, setSigningReport] = useState<Report | null>(null);
    const [signPass, setSignPass] = useState('');
    const [showSignDialog, setShowSignDialog] = useState(false);
    const [signingMode, setSigningMode] = useState<'single' | 'all'>('single');
    const [postSignAction, setPostSignAction] = useState<{ type: 'download' | 'whatsapp'; reportId: string } | null>(null);
    
    // Custom non-blocking modal alert replacement for sandboxed iframe viewport
    const [pendingSignWarning, setPendingSignWarning] = useState<string | null>(null);
    const [customAlert, setCustomAlert] = useState<string | null>(null);
    const showAlert = (message: string) => {
        setCustomAlert(message);
    };

    useEffect(() => {
        const seen = localStorage.getItem('rcm_tut_reports');
        if (!seen) {
            setShowTutorial(true);
        }
        loadData();
    }, [refreshTrigger]);

    const closeTutorial = () => {
        localStorage.setItem('rcm_tut_reports', 'true');
        setShowTutorial(false);
    };

    const handleSignAllClick = () => {
        const unsigned = activeReports.filter(r => !r.status?.signed);
        if (unsigned.length === 0) {
            showAlert("No hay reportes pendientes de firma.");
            return;
        }
        setSigningMode('all');
        setShowSignDialog(true);
    };

    const triggerDownload = async (report: Report) => {
        if (!report.pdfBlob) {
            showAlert("El reporte no contiene un archivo PDF generado.");
            return;
        }
        const datePart = report.date.split('T')[0];
        const safeProgram = report.program.replace(/[^a-zA-Z0-9]/g, '-');
        const downloadName = `PM-${safeProgram}-${datePart}.pdf`;

        const url = URL.createObjectURL(report.pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();

        await updateReportStatus(report.id, { downloaded: true });
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, downloaded: true, sent: r.status?.sent || false } } : r));
    };

    const triggerSendWhatsApp = async (report: Report) => {
        const adminUser = users.find(u => u.role === 'admin' || u.classification === 'Administrador');
        let phone = adminUser?.phone || adminUser?.mobile || '54413935';
        
        if (!phone) {
            showAlert('No se encontró el número de teléfono del administrador.');
            return;
        }

        if (!phone.startsWith('53')) {
            phone = '53' + phone;
        }

        const datePart = report.date.split('T')[0];
        const safeProgram = report.program.replace(/[^a-zA-Z0-9]/g, '-');
        const fileName = `PM-${safeProgram}-${datePart}.pdf`;
        
        // Texto de respaldo si no se puede enviar el archivo PDF o falla
        let text = `Hola Administrador, adjunto el reporte musical del programa *${report.program}* del día *${datePart}*.\n\n`;
        
        if (report.status?.signed) {
            text += `Este reporte ha sido firmado digitalmente por: ${report.generatedBy}\n\n`;
        }

        if (report.items && report.items.length > 0) {
            text += "*CRÉDITOS:*\n";
            report.items.forEach((item, index) => {
                text += `${index + 1}. ${item.title} - ${item.performer}\n`;
            });
        }
        
        // Intentar compartir usando API Web Share nativa si está disponible (adjuntar PDF)
        if (report.pdfBlob && typeof navigator !== 'undefined' && navigator.share) {
            try {
                const file = new File([report.pdfBlob], fileName, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Reporte Musical - ${report.program}`,
                        text: text
                    });
                    await updateReportStatus(report.id, { sent: true, downloaded: true });
                    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true, downloaded: true } } : r));
                    return; // Compartido con éxito; salimos para evitar la redirección por fallback
                }
            } catch (shareErrAny: any) {
                if (shareErrAny && shareErrAny.name !== 'AbortError') {
                    console.error("Fallo compartición nativa:", shareErrAny);
                } else if (shareErrAny && shareErrAny.name === 'AbortError') {
                    return; // El usuario canceló la caja de compartir nativa
                }
            }
        }
        
        // Abrir directamente el chat de WhatsApp con el Administrador
        openWhatsApp(text, phone);
        
        await updateReportStatus(report.id, { sent: true });
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true } } : r));
    };

    const getGlobalUserExtraData = (username: string) => {
        try {
            const savedEquipo = localStorage.getItem('rcm_equipo_cmnl');
            if (savedEquipo) {
                const equipo = JSON.parse(savedEquipo);
                if (Array.isArray(equipo)) {
                    const found = equipo.find((m: any) => 
                        (m.username && m.username.toLowerCase() === username.toLowerCase()) || 
                        (m.id && m.id.toLowerCase() === username.toLowerCase()) ||
                        (m.designatedUserId && m.designatedUserId.toLowerCase() === username.toLowerCase())
                    );
                    if (found) {
                        return {
                            ci: found.ci || '',
                            tomo: found.tomo || '0',
                            folio: found.folio || '0',
                            name: found.name || ''
                        };
                    }
                }
            }
            
            const savedUsers = localStorage.getItem('rcm_users') || localStorage.getItem('rcm_data_users');
            if (savedUsers) {
                const usersList = JSON.parse(savedUsers);
                if (Array.isArray(usersList)) {
                    const found = usersList.find((u: any) => u.username && u.username.toLowerCase() === username.toLowerCase());
                    if (found) {
                        return {
                            ci: found.ci || '',
                            tomo: found.tomo || '0',
                            folio: found.folio || '0',
                            name: found.name || found.fullName || ''
                        };
                    }
                }
            }
        } catch (e) {
            console.error("Error retrieving global user extra data:", e);
        }
        return { ci: '', tomo: '0', folio: '0', name: '' };
    };

    const confirmSignReport = async () => {
        try {
            if (!currentUser) {
                showAlert("Error: No se encontró ningún usuario autenticado.");
                return;
            }
            if (signingMode === 'single' && !signingReport) {
                showAlert("Error: No se seleccionó ningún reporte para firmar.");
                return;
            }
            
            const globalUserId = (currentUser as any).id || currentUser.username;
            
            // Core Security Authorization Check (72-hour and 30-day rules)
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

            // Fetch extra user info (like CI) for original password calculation
            const extraData = getGlobalUserExtraData(currentUser.username);
            const ciPart = extraData.ci || '';
            const namePart = (extraData.name || currentUser.fullName || currentUser.username).split(' ')[0] || '';
            const originalPass = (namePart.substring(0, 4) + ciPart.substring(0, 4)).toUpperCase().substring(0, 8);

            const inputPassUpper = signPass.trim().toUpperCase();
            const inputPassNormal = signPass.trim();

            let isAuthorized = false;
            let signature = '';

            if (cert) {
                const issueDate = cert.issueDate ? new Date(cert.issueDate).getTime() : Date.now();
                

                // If they have a certificate, verify against stored certificate password, original certificate password, original generated pass, or local login password
                const effectivePass = storedPass || cert.originalPassword || '';
                const localPass = currentUser.password || '';

                if (
                    inputPassNormal === effectivePass.trim() ||
                    inputPassUpper === originalPass ||
                    (localPass && inputPassNormal === localPass.trim())
                ) {
                    isAuthorized = true;
                    signature = generateDigitalSignature(cert);
                } else {
                    showAlert("Contraseña de firma incorrecta.");
                    return;
                }
            } else {
                // If they don't have a certificate, allow directors on authorized devices (which is any director access here)
                // using original generated password or local login password
                const localPass = currentUser.password || '';
                
                if (
                    inputPassUpper === originalPass || 
                    (localPass && inputPassNormal === localPass.trim()) ||
                    (storedPass && inputPassNormal === storedPass.trim())
                ) {
                    isAuthorized = true;
                    // Generate a stable signature using mock certificate
                    const mockCert = { 
                        userData: { 
                            fullName: extraData.name || currentUser.fullName || currentUser.username, 
                            ci: extraData.ci || '', 
                            tomo: extraData.tomo || '0', 
                            folio: extraData.folio || '0' 
                        }, 
                        contracts: {} 
                    };
                    signature = `[AUTH] ${generateDigitalSignature(mockCert)}`;
                } else {
                    showAlert("Contraseña incorrecta o firma digital no cargada.");
                    return;
                }
            }

            if (!isAuthorized) {
                showAlert("Contraseña de firma incorrecta o dispositivo no autorizado.");
                return;
            }

            const userFullName = currentUser.fullName || currentUser.username;
            
            if (signingMode === 'single' && signingReport) {
                const newPdfBlob = generateReportPDF({
                    userFullName,
                    userUniqueId: signature,
                    program: signingReport.program,
                    date: signingReport.date,
                    items: signingReport.items || []
                });

                const updatedReport: Report = {
                    ...signingReport,
                    pdfBlob: newPdfBlob,
                    status: { ...signingReport.status, downloaded: signingReport.status?.downloaded || false, sent: signingReport.status?.sent || false, signed: true }
                };

                await saveReportToDB(updatedReport);
                setReports(prev => prev.map(r => r.id === signingReport.id ? updatedReport : r));
                
                // Trigger post-signing action automatically if any
                if (postSignAction && postSignAction.reportId === signingReport.id) {
                    const actionType = postSignAction.type;
                    setPostSignAction(null); // Clear first
                    if (actionType === 'download') {
                        await triggerDownload(updatedReport);
                    } else if (actionType === 'whatsapp') {
                        await triggerSendWhatsApp(updatedReport);
                    }
                } else {
                    showAlert("Reporte firmado correctamente con su certificado digital.");
                }
            } else if (signingMode === 'all') {
                const unsigned = activeReports.filter(r => !r.status?.signed);
                let successCount = 0;
                const newReports = [...reports];

                for (const r of unsigned) {
                    try {
                        const newPdfBlob = generateReportPDF({
                            userFullName,
                            userUniqueId: signature,
                            program: r.program,
                            date: r.date,
                            items: r.items || []
                        });
                        
                        const updatedReport: Report = {
                            ...r,
                            pdfBlob: newPdfBlob,
                            status: { ...r.status, downloaded: r.status?.downloaded || false, sent: r.status?.sent || false, signed: true }
                        };
                        await saveReportToDB(updatedReport);
                        
                        const index = newReports.findIndex(rep => rep.id === r.id);
                        if (index !== -1) {
                            newReports[index] = updatedReport;
                        }
                        successCount++;
                    } catch(e: any) {
                        console.error("Error signing report", r.id, e);
                    }
                }
                
                setReports(newReports);
                showAlert(`Se firmaron correctamente ${successCount} reportes.`);

                // Si estaba en el modal de ZIP, iniciar de inmediato la generación con barra de progreso
                if (showZipModal) {
                    setTimeout(() => {
                        startZipGeneration(newReports);
                    }, 400);
                }
            }
            
            setShowSignDialog(false);
            setSigningReport(null);
            setSignPass('');
        } catch (error: any) {
            console.error("Error crítico al firmar:", error);
            showAlert("Error crítico al firmar: " + (error?.message || error || "Desconocido"));
        }
    };

    const isMonthConcluded = (dateStr: string): boolean => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const repYear = d.getFullYear();
            const repMonth = d.getMonth();
            return repYear < currentYear || (repYear === currentYear && repMonth < currentMonth);
        } catch (e) {
            return false;
        }
    };

    // Un reporte solo pasa a archivo si el usuario decide explícitamente archivarlo (no de forma automática)
    const isArchived = (r: Report): boolean => {
        return r.archived === true;
    };

    const activeReports = React.useMemo(() => {
        return reports.filter(r => !isArchived(r));
    }, [reports]);

    const unsignedReports = React.useMemo(() => {
        return activeReports.filter(r => !r.status?.signed);
    }, [activeReports]);

    const hasUnsignedReports = unsignedReports.length > 0;

    // Reportes activos en pantalla que pertenecen a meses concluidos pero aún no han sido archivados
    const concludedUnarchivedReports = React.useMemo(() => {
        return reports.filter(r => !r.archived && isMonthConcluded(r.date));
    }, [reports]);

    const archivedReports = React.useMemo(() => {
        return reports.filter(r => isArchived(r));
    }, [reports]);

    const handleArchiveConcludedReports = async () => {
        const toArchive = reports.filter(r => !r.archived && isMonthConcluded(r.date));
        const now = new Date().toISOString();
        const updated = reports.map(r => {
            if (!r.archived && isMonthConcluded(r.date)) {
                return { ...r, archived: true, archivedAt: now };
            }
            return r;
        });
        for (const r of toArchive) {
            await saveReportToDB({ ...r, archived: true, archivedAt: now });
        }
        setReports(updated);
        setShowConcludedPrompt(false);
        showAlert(`Se han trasladado ${toArchive.length} reportes de meses concluidos al Archivo.`);
    };

    const handleConfirmPostZipArchive = async () => {
        const toArchive = showPostZipArchivePrompt.reportsToArchive;
        const targetIds = new Set(toArchive.map(r => r.id));
        const now = new Date().toISOString();
        const updated = reports.map(r => {
            if (targetIds.has(r.id)) {
                return { ...r, archived: true, archivedAt: now };
            }
            return r;
        });
        for (const r of toArchive) {
            await saveReportToDB({ ...r, archived: true, archivedAt: now });
        }
        setReports(updated);
        setShowPostZipArchivePrompt({ show: false, reportsToArchive: [], message: '' });
        showAlert(`Se han trasladado ${toArchive.length} reportes empaquetados al Archivo.`);
    };

    const groupedArchivedReports = React.useMemo(() => {
        const groups: Record<string, { label: string; dateSort: number; reports: Report[] }> = {};
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const filtered = archiveSearchQuery.trim()
            ? archivedReports.filter(r => 
                (r.program && r.program.toLowerCase().includes(archiveSearchQuery.toLowerCase())) ||
                (r.fileName && r.fileName.toLowerCase().includes(archiveSearchQuery.toLowerCase())) ||
                (r.date && r.date.includes(archiveSearchQuery)) ||
                (r.generatedBy && r.generatedBy.toLowerCase().includes(archiveSearchQuery.toLowerCase()))
              )
            : archivedReports;

        filtered.forEach(r => {
            let year = 2026;
            let monthIndex = 0;
            try {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    year = d.getFullYear();
                    monthIndex = d.getMonth();
                }
            } catch(e) {}
            
            const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            const label = `${monthNames[monthIndex]} ${year}`;
            const dateSort = year * 100 + monthIndex;
            
            if (!groups[key]) {
                groups[key] = { label, dateSort, reports: [] };
            }
            groups[key].reports.push(r);
        });
        
        return Object.entries(groups)
            .sort((a, b) => b[1].dateSort - a[1].dateSort)
            .map(([key, data]) => ({
                key,
                label: data.label,
                reports: data.reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            }));
    }, [archivedReports, archiveSearchQuery]);

    const handleArchiveAdvance = async (report: Report) => {
        if (window.confirm(`¿Enviar el reporte "${report.fileName || report.program}" al Archivo de forma adelantada?`)) {
            const updated: Report = {
                ...report,
                archived: true,
                archivedAt: new Date().toISOString()
            };
            await saveReportToDB(updated);
            showAlert(`El reporte "${report.fileName || report.program}" se ha enviado al Archivo.`);
            loadData();
        }
    };

    const handleRestoreReport = async (report: Report) => {
        const updated: Report = {
            ...report,
            archived: false
        };
        delete (updated as any).archivedAt;
        await saveReportToDB(updated);
        showAlert(`El reporte "${report.fileName || report.program}" ha sido restaurado a la lista de reportes activos.`);
        loadData();
    };

    const getAdminPhone = (): string => {
        let admin = users.find(u => u.role === 'admin' || (u as any).classification === 'Administrador' || u.username === 'admin');
        if (!admin) {
            try {
                const raw = localStorage.getItem('rcm_users') || localStorage.getItem('rcm_data_users');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        admin = parsed.find((u: any) => u.role === 'admin' || u.classification === 'Administrador' || u.username === 'admin');
                    }
                }
            } catch(e) {}
        }
        if (!admin) {
            try {
                const raw = localStorage.getItem('rcm_equipo_cmnl');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        admin = parsed.find((u: any) => u.role === 'admin' || (u.cargo && u.cargo.toLowerCase().includes('administrador')) || u.username === 'admin');
                    }
                }
            } catch(e) {}
        }

        let phone = (admin as any)?.phone || (admin as any)?.mobile || (admin as any)?.telefono || '54413935';
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.length === 8 && !phone.startsWith('53')) {
            phone = '53' + phone;
        }
        return phone || '5354413935';
    };

    const handleOpenZipModal = () => {
        if (activeReports.length === 0) {
            showAlert("No hay reportes musicales en esta pantalla para empaquetar en ZIP.");
            return;
        }
        setShowZipModal(true);

        // Si todos los reportes están firmados, inicia la generación inmediatamente con barra de progreso
        const unsigned = activeReports.filter(r => !r.status?.signed);
        if (unsigned.length === 0) {
            startZipGeneration();
        }
    };

    const startZipGeneration = async (customReportsList?: Report[]) => {
        const sourceReports = (customReportsList || activeReports).filter(r => !isArchived(r));
        if (sourceReports.length === 0) return;

        setIsZipping(true);
        setZipProgress(5);
        setZipStatusText("Iniciando empaquetado de reportes...");
        setGeneratedZip(null);

        try {
            const zip = new JSZip();
            let count = 0;
            const total = sourceReports.length;

            for (let idx = 0; idx < total; idx++) {
                const r = sourceReports[idx];
                const safeProgram = (r.program || 'Programa').replace(/[^a-zA-Z0-9_-]/g, '_');
                const datePart = r.date ? r.date.split('T')[0] : `reporte-${idx + 1}`;
                const filename = `PM-${safeProgram}-${datePart}${total > 1 ? `-${idx + 1}` : ''}.pdf`;

                const pct = Math.round(10 + ((idx + 1) / total) * 70);
                setZipProgress(pct);
                setZipStatusText(`Procesando reporte ${idx + 1} de ${total}: ${r.program || 'Programa'}...`);

                // Pequeña pausa para permitir que la barra de progreso se anime fluidamente
                await new Promise(res => setTimeout(res, 60));

                if (r.pdfBlob) {
                    zip.file(filename, r.pdfBlob);
                    count++;
                } else {
                    try {
                        const userFullName = r.generatedBy || currentUser?.fullName || currentUser?.username || 'Dirección de Programa';
                        const signature = r.status?.signed ? `[REG] ${r.id}` : '';
                        const generatedBlob = generateReportPDF({
                            userFullName,
                            userUniqueId: signature,
                            program: r.program,
                            date: r.date,
                            items: r.items || []
                        });
                        zip.file(filename, generatedBlob);
                        count++;
                    } catch (err) {
                        console.error(`Error generando PDF para reporte ${r.id}:`, err);
                    }
                }
            }

            setZipProgress(85);
            setZipStatusText("Comprimiendo archivo ZIP final...");
            await new Promise(res => setTimeout(res, 80));

            const blob = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (metadata) => {
                    const compPct = Math.round(85 + (metadata.percent / 100) * 14);
                    setZipProgress(Math.min(99, compPct));
                }
            );

            const nowStr = new Date().toISOString().split('T')[0];
            const fileName = `Reportes_Musicales_${nowStr}.zip`;
            const file = new File([blob], fileName, { type: 'application/zip' });

            const sizeInKB = Math.round(blob.size / 1024);
            const fileSizeStr = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

            setZipProgress(100);
            setZipStatusText(`¡Empaquetado culminado con éxito! (${fileSizeStr})`);
            setGeneratedZip({ blob, file, fileName, count, fileSizeStr });
        } catch (err: any) {
            console.error("Error al generar paquete ZIP:", err);
            showAlert("Error al generar el archivo ZIP: " + (err?.message || err));
            setZipStatusText("Error durante la generación");
        } finally {
            setIsZipping(false);
        }
    };

    const handleDownloadZipFile = () => {
        if (!generatedZip) return;

        try {
            const url = URL.createObjectURL(generatedZip.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = generatedZip.fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            setShowZipModal(false);

            // Preguntar si se pasan estos mismos reportes para archivo
            setShowPostZipArchivePrompt({
                show: true,
                reportsToArchive: [...activeReports],
                message: `Archivo ZIP descargado exitosamente en su dispositivo (${generatedZip.fileName}).\n\n¿Deseas pasar estos ${generatedZip.count} reportes empaquetados para el Archivo?`
            });
        } catch (e: any) {
            console.error("Error descargando ZIP:", e);
            showAlert("Error al descargar el archivo ZIP: " + (e?.message || e));
        }
    };

    const handleShareZip = async () => {
        if (!generatedZip) return;

        const senderName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Dirección de Programa';
        const dateStr = new Date().toLocaleDateString('es-ES');

        let text = `Reportes musicales (${generatedZip.count} reportes: ${generatedZip.fileName}).\nFecha: ${dateStr}\nRemitente: ${senderName}\n`;

        // Flujo nativo de compartición del móvil (abre las opciones de aplicaciones admisibles del teléfono: WhatsApp, Telegram, Gmail, Mensajes, etc.)
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                const shareData: ShareData = {
                    files: [generatedZip.file],
                    title: `Reportes Musicales - ${generatedZip.fileName}`,
                    text: text
                };

                if (!navigator.canShare || navigator.canShare({ files: [generatedZip.file] })) {
                    await navigator.share(shareData);
                    setShowZipModal(false);
                    setShowPostZipArchivePrompt({
                        show: true,
                        reportsToArchive: [...activeReports],
                        message: `Paquete ZIP (${generatedZip.fileName}) compartido con éxito.\n\n¿Deseas pasar estos ${generatedZip.count} reportes para el Archivo?`
                    });
                    return; // Compartido con éxito; salimos
                }
            } catch (shareErrAny: any) {
                if (shareErrAny && shareErrAny.name === 'AbortError') {
                    // El usuario canceló la caja de compartir nativa
                    return;
                }
                console.error("Fallo compartición nativa ZIP:", shareErrAny);
            }
        }

        // Si la compartición nativa no está disponible en este dispositivo, descargar directamente
        handleDownloadZipFile();
    };

    const loadData = async () => {
        setIsLoading(true);
        const filterUser = currentUser ? currentUser.username : undefined;
        const data = await loadReportsFromDB(filterUser);
        setReports(data);
        setIsLoading(false);

        // Si al entrar a Reportes hay reportes de meses concluidos sin archivar, mostrar cuadro de diálogo
        const unarchivedConcluded = data.filter((r: Report) => !r.archived && isMonthConcluded(r.date));
        if (unarchivedConcluded.length > 0) {
            setShowConcludedPrompt(true);
        }
    };

    const handleDownload = async (report: Report) => {
        if (!report.status?.signed) {
            showAlert("No se puede descargar un reporte sin firmar. Por favor, fírmelo digitalmente primero.");
            setPostSignAction({ type: 'download', reportId: report.id });
            setSigningMode('single');
            setSigningReport(report);
            setShowSignDialog(true);
            return;
        }

        await triggerDownload(report);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este reporte permanentemente del sistema? Esta acción no se puede deshacer.")) {
            await deleteReportFromDB(id);
            loadData();
        }
    };

    const handleClearAll = async () => {
        if (window.confirm("¿Estás seguro de que deseas eliminar TODOS los reportes generados? Esta acción no se puede deshacer.")) {
            await clearReportsDB();
            loadData();
        }
    };

    const summaryData = React.useMemo(() => {
        const stats: Record<string, { total: number, downloaded: number }> = {};
        
        activeReports.forEach(r => {
            if (!stats[r.program]) {
                stats[r.program] = { total: 0, downloaded: 0 };
            }
            stats[r.program].total++;
            if (r.status?.downloaded) stats[r.program].downloaded++;
        });
        
        return Object.entries(stats).map(([program, data]) => ({ program, ...data }));
    }, [activeReports]);

    if (showBatchSigner) {
        return (
            <div className="h-full bg-[#1A100C]">
                <div className="p-4 flex items-center justify-between border-b border-[#9E7649]/20">
                    <button onClick={() => setShowBatchSigner(false)} className="text-[#E8DCCF] hover:text-white flex items-center gap-1 text-sm font-bold">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Volver
                    </button>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest text-[#9E7649]">Firma por Carga</h2>
                </div>
                <div className="h-[calc(100%-60px)]">
                    <BatchSigner currentUser={currentUser} onFinish={() => setShowBatchSigner(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24 relative">
            {/* Cabecera Principal */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                    {viewMode === 'archive' && (
                        <button 
                            onClick={() => setViewMode('active')} 
                            className="bg-[#2C1B15] text-[#E8DCCF] hover:text-white border border-[#9E7649]/30 hover:border-[#9E7649] px-3 py-1.5 rounded-xl flex items-center gap-1 text-xs font-bold transition-all shadow-sm"
                            title="Volver a reportes activos"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            <span>Volver</span>
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#9E7649]">
                            {viewMode === 'archive' ? 'inventory_2' : 'description'}
                        </span>
                        {viewMode === 'archive' ? 'Archivo de Reportes' : 'Reportes Musicales'}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botón Archivo al lado del botón de Resumen */}
                    <button 
                        onClick={() => setViewMode(prev => prev === 'archive' ? 'active' : 'archive')}
                        className={`border px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
                            viewMode === 'archive' 
                                ? 'bg-[#9E7649] text-white border-[#9E7649]' 
                                : 'bg-[#2C1B15] text-[#9E7649] hover:text-[#BCA387] border-[#9E7649]/30 hover:border-[#9E7649]/60'
                        }`}
                        title={viewMode === 'archive' ? "Ver reportes activos" : "Abrir Archivo de reportes concluidos y archivados"}
                    >
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        <span>Archivo</span>
                        {archivedReports.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-[#9E7649]/30 text-amber-200 text-[10px] rounded-full font-mono">
                                {archivedReports.length}
                            </span>
                        )}
                    </button>

                    {/* Botón Resumen */}
                    {activeReports.length > 0 && viewMode === 'active' && (
                        <button 
                            onClick={() => setShowSummary(true)}
                            className="bg-[#2C1B15] border border-[#9E7649]/30 hover:border-[#9E7649]/60 text-[#9E7649] hover:text-[#BCA387] px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
                            title="Ver resumen estadístico"
                        >
                            <span className="material-symbols-outlined text-sm">analytics</span>
                            <span className="hidden sm:inline">Resumen</span>
                        </button>
                    )}
                </div>
            </div>

            {/* VISTA ARCHIVO: Organizado por meses */}
            {viewMode === 'archive' ? (
                <div className="space-y-6 animate-fade-in">
                    {/* Barra de información y búsqueda de Archivo */}
                    <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">history_edu</span>
                                Historial de Reportes Archivados
                            </h3>
                            <p className="text-xs text-[#E8DCCF]/70 mt-0.5">
                                Aquí se organizan por meses los reportes musicales en PDF una vez que el mes ha concluido o han sido archivados de forma adelantada.
                            </p>
                        </div>
                        <div className="w-full md:w-72 relative">
                            <input 
                                type="text"
                                value={archiveSearchQuery}
                                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                                placeholder="Buscar por programa o fecha..."
                                className="w-full bg-[#1A100C] border border-[#9E7649]/30 text-white placeholder-[#E8DCCF]/40 text-xs rounded-xl px-3 py-2 pl-9 focus:border-[#9E7649] outline-none"
                            />
                            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#E8DCCF]/40 text-base">search</span>
                            {archiveSearchQuery && (
                                <button 
                                    onClick={() => setArchiveSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-[#E8DCCF]/40 hover:text-white"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-4 border-[#9E7649] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : groupedArchivedReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#E8DCCF]/40 bg-[#2C1B15]/20 rounded-2xl border border-[#9E7649]/10">
                            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">inventory_2</span>
                            <p className="text-sm font-semibold text-[#E8DCCF]/60">
                                {archiveSearchQuery ? 'No se encontraron reportes con ese criterio.' : 'No hay reportes en el Archivo actualmente.'}
                            </p>
                            <p className="text-xs mt-2 text-center max-w-md">
                                Los reportes musicales en PDF pasan aquí automáticamente al terminar cada mes, o cuando pulsas el botón de enviar a Archivo de forma adelantada en la pantalla principal.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedArchivedReports.map(group => (
                                <div key={group.key} className="bg-[#2C1B15]/40 rounded-2xl border border-[#9E7649]/25 p-4 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-[#9E7649]/20 pb-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#9E7649] text-xl">folder</span>
                                            <h4 className="font-bold text-white text-base tracking-wide capitalize">{group.label}</h4>
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#9E7649]/20 text-[#E8DCCF] border border-[#9E7649]/30">
                                            {group.reports.length} {group.reports.length === 1 ? 'reporte' : 'reportes'}
                                        </span>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                                        {group.reports.map(report => (
                                            <div key={report.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm flex flex-col justify-between gap-3 group hover:border-[#9E7649]/50 transition-all relative">
                                                <div className="absolute top-2 right-2 flex gap-1.5 items-center">
                                                    {report.status?.signed && (
                                                        <span title="Reporte Firmado Digitalmente" className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                                            Firmado
                                                        </span>
                                                    )}
                                                    {report.status?.sent && (
                                                        <span title="Enviado por WhatsApp" className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></span>
                                                    )}
                                                    {report.status?.downloaded && (
                                                        <span title="Descargado" className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                                    )}
                                                </div>

                                                <div className="flex items-start gap-3 overflow-hidden">
                                                    <div className="size-11 rounded-lg bg-red-900/20 text-red-400 flex items-center justify-center shrink-0 border border-red-900/30 mt-0.5">
                                                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1 pr-14">
                                                        <h5 className="font-bold text-white truncate text-xs sm:text-sm" title={report.fileName}>
                                                            {report.fileName}
                                                        </h5>
                                                        <div className="flex flex-wrap text-[11px] text-[#E8DCCF]/70 gap-x-3 gap-y-0.5 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                                                {report.date.includes('-') ? report.date.split('-').reverse().join('/') : new Date(report.date).toLocaleDateString()}
                                                            </span>
                                                            <span className="flex items-center gap-1 truncate">
                                                                <span className="material-symbols-outlined text-[10px]">radio</span>
                                                                {report.program}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-[#E8DCCF]/40 mt-1 truncate">
                                                            Generado por: {report.generatedBy} {report.archived && !isMonthConcluded(report.date) ? '• (Archivado adelantado)' : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Botones de acción en Archivo: editar, consultar, enviar por whatsapp, descargar y eliminar */}
                                                <div className="flex flex-wrap gap-1.5 justify-end border-t border-[#9E7649]/15 pt-2.5 mt-1">
                                                    {/* Editar */}
                                                    <button 
                                                        onClick={() => onEdit(report)}
                                                        className="px-2.5 py-1.5 bg-[#1A100C] text-[#E8DCCF]/90 text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-[#3E1E16] hover:text-white transition-colors border border-[#9E7649]/20"
                                                        title="Editar reporte"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit_document</span>
                                                        <span>Editar</span>
                                                    </button>

                                                    {/* Consultar */}
                                                    <button 
                                                        onClick={() => setConsultingReport(report)}
                                                        className="px-2.5 py-1.5 bg-[#1A100C] text-amber-300 text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-[#3E1E16] hover:text-amber-200 transition-colors border border-[#9E7649]/20"
                                                        title="Consultar detalles y propiedades completas del reporte"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                        <span>Consultar</span>
                                                    </button>

                                                    {/* Enviar por WhatsApp */}
                                                    <button 
                                                        onClick={async () => {
                                                            if (!report.status?.signed) {
                                                                showAlert("No se puede enviar un reporte sin firmar. Por favor, fírmelo digitalmente primero.");
                                                                setPostSignAction({ type: 'whatsapp', reportId: report.id });
                                                                setSigningMode('single');
                                                                setSigningReport(report);
                                                                setShowSignDialog(true);
                                                                return;
                                                            }
                                                            await triggerSendWhatsApp(report);
                                                        }}
                                                        className="size-8 rounded-lg bg-[#1A100C] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center border border-[#9E7649]/20"
                                                        title="Enviar por WhatsApp"
                                                    >
                                                        <span className="material-symbols-outlined text-base">send</span>
                                                    </button>

                                                    {/* Descargar */}
                                                    <button 
                                                        onClick={() => handleDownload(report)}
                                                        className="size-8 rounded-lg bg-[#1A100C] text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center border border-[#9E7649]/20"
                                                        title="Descargar PDF"
                                                    >
                                                        <span className="material-symbols-outlined text-base">download</span>
                                                    </button>

                                                    {/* Restaurar a activos si fue archivado de forma adelantada */}
                                                    {report.archived && !isMonthConcluded(report.date) && (
                                                        <button 
                                                            onClick={() => handleRestoreReport(report)}
                                                            className="size-8 rounded-lg bg-[#1A100C] text-[#E8DCCF]/60 hover:bg-[#9E7649] hover:text-white transition-colors flex items-center justify-center border border-[#9E7649]/20"
                                                            title="Restaurar a reportes activos"
                                                        >
                                                            <span className="material-symbols-outlined text-base">unarchive</span>
                                                        </button>
                                                    )}

                                                    {/* Eliminar reporte (Aparece en Archivo según lo solicitado) */}
                                                    <button 
                                                        onClick={() => handleDelete(report.id)}
                                                        className="size-8 rounded-lg bg-[#1A100C] text-red-400/80 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center border border-red-900/30"
                                                        title="Eliminar reporte permanentemente"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* VISTA ACTIVA: Reportes del mes actual */
                <>
                    {/* Contenedor de Botones de Acción */}
                    {activeReports.length > 0 && (
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full mb-6 bg-[#2C1B15]/30 p-2.5 rounded-2xl border border-[#9E7649]/15">
                            {/* Firmar Todo */}
                            {currentUser?.role === 'director' && (
                                <button 
                                    onClick={handleSignAllClick}
                                    disabled={!activeReports.some(r => !r.status?.signed)}
                                    className={`flex-[1.4] h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md ${
                                        activeReports.some(r => !r.status?.signed) 
                                            ? 'bg-yellow-600 text-white hover:bg-yellow-500 hover:scale-[1.01] cursor-pointer' 
                                            : 'bg-yellow-900/10 text-yellow-600/40 border border-yellow-950/20 cursor-not-allowed'
                                    }`}
                                    title={activeReports.some(r => !r.status?.signed) ? "Firmar todos los reportes pendientes" : "No hay reportes pendientes de firma"}
                                >
                                    <span className="material-symbols-outlined text-xl">draw</span>
                                    <span className="hidden sm:inline">Firmar todo</span>
                                </button>
                            )}

                            {/* Generar ZIP - Entre Firmar todo y Firma por carga */}
                            <button 
                                onClick={handleOpenZipModal}
                                className="flex-[1.4] h-12 bg-amber-700/85 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-md border border-amber-500/25"
                                title="Empaquetar todos los reportes de esta pantalla en un archivo ZIP"
                            >
                                <span className="material-symbols-outlined text-xl">folder_zip</span>
                                <span className="hidden sm:inline">Generar ZIP</span>
                            </button>

                            {/* Firma Por Carga */}
                            <button 
                                onClick={() => setShowBatchSigner(true)}
                                className="flex-[1.4] h-12 bg-[#9E7649] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#8B653D] hover:scale-[1.01] transition-all shadow-md"
                                title="Cargar firmas en lote"
                            >
                                <span className="material-symbols-outlined text-xl">upload_file</span>
                                <span className="hidden sm:inline">Firma por carga</span>
                            </button>

                            {/* Limpiar */}
                            <button 
                                onClick={handleClearAll}
                                className="flex-1 h-12 bg-red-950/20 text-red-400 border border-red-900/15 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-900/20 hover:scale-[1.01] transition-all shadow-md"
                                title="Borrar TODOS los reportes"
                            >
                                <span className="material-symbols-outlined text-xl">delete_sweep</span>
                                <span className="hidden sm:inline">Limpiar todo</span>
                            </button>
                        </div>
                    )}

                    {showTutorial && (
                        <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-4 rounded-xl mb-6 flex gap-3 animate-fade-in relative">
                            <span className="material-symbols-outlined text-[#9E7649] text-2xl">info</span>
                            <div className="flex-1">
                                <h4 className="font-bold text-[#9E7649] text-sm mb-1">Tus Reportes Personales</h4>
                                <p className="text-xs text-[#E8DCCF]/80">Aquí se guardan automáticamente los PDFs que generas. Solo tú puedes verlos. Puedes descargarlos, re-editarlos o ver un resumen de tu actividad.</p>
                            </div>
                            <button onClick={closeTutorial} className="absolute top-2 right-2 text-[#E8DCCF]/40 hover:text-white">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-[#9E7649] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : activeReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#E8DCCF]/40">
                            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_off</span>
                            <p>No hay reportes activos en este momento.</p>
                            <p className="text-xs mt-2 text-center max-w-sm">
                                Los reportes generados en la sección de Selección aparecerán aquí. Si deseas consultar reportes de meses anteriores o archivados, pulsa en el botón <strong>Archivo</strong> arriba.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeReports.map((report) => (
                                <div key={report.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm flex flex-col gap-3 group hover:border-[#9E7649]/50 transition-colors relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 flex gap-1.5 items-center">
                                        {report.status?.signed && <span title="Resultado de firma: FIRMADO" className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" id={`signed-indicator-${report.id}`}></span>}
                                        {report.status?.sent && <span title="Enviado por WhatsApp" className="w-2.5 h-2.5 rounded-full bg-[#25D366]" id={`whatsapp-indicator-${report.id}`}></span>}
                                        {report.status?.downloaded && <span title="Descargado" className="w-2.5 h-2.5 rounded-full bg-blue-500" id={`download-indicator-${report.id}`}></span>}
                                    </div>

                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="size-12 rounded-lg bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-white truncate text-sm">{report.fileName}</h4>
                                            <div className="flex flex-wrap text-xs text-[#E8DCCF]/60 gap-x-3 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">calendar_today</span> 
                                                    {report.date.includes('-') ? report.date.split('-').reverse().join('/') : new Date(report.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[10px]">radio</span> {report.program}</span>
                                            </div>
                                            <p className="text-[10px] text-[#E8DCCF]/40 mt-1 truncate">Generado por: {report.generatedBy}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end border-t border-[#9E7649]/10 pt-3">
                                        <button 
                                            onClick={() => onEdit(report)}
                                            className="flex-1 bg-[#1A100C] text-[#E8DCCF]/80 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-1 hover:bg-[#3E1E16] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit_document</span> Editar
                                        </button>

                                        <button 
                                            onClick={async () => {
                                                if (!report.status?.signed) {
                                                    showAlert("No se puede enviar un reporte sin firmar. Por favor, fírmelo digitalmente primero.");
                                                    setPostSignAction({ type: 'whatsapp', reportId: report.id });
                                                    setSigningMode('single');
                                                    setSigningReport(report);
                                                    setShowSignDialog(true);
                                                    return;
                                                }

                                                await triggerSendWhatsApp(report);
                                            }}
                                            className="size-8 rounded-full bg-[#1A100C] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center"
                                            title="Enviar por WhatsApp"
                                        >
                                            <span className="material-symbols-outlined text-sm">send</span>
                                        </button>

                                        <button 
                                            onClick={() => handleDownload(report)}
                                            className="size-8 rounded-full bg-[#1A100C] text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
                                            title="Descargar PDF"
                                        >
                                            <span className="material-symbols-outlined text-sm">download</span>
                                        </button>

                                        {/* Botón sustituido: Enviar a Archivo de forma adelantada (Sustituye a Eliminar) */}
                                        <button 
                                            onClick={() => handleArchiveAdvance(report)}
                                            className="size-8 rounded-full bg-[#1A100C] text-[#9E7649] hover:bg-[#9E7649] hover:text-white transition-colors flex items-center justify-center"
                                            title="Enviar este reporte a Archivo de forma adelantada"
                                        >
                                            <span className="material-symbols-outlined text-sm">inventory_2</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal de Generación de Paquete ZIP */}
            {showZipModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => !isZipping && setShowZipModal(false)}>
                    <div className="bg-[#2C1B15] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-amber-500 mb-2">
                            <span className="material-symbols-outlined text-3xl">folder_zip</span>
                            <h3 className="text-xl font-bold text-white">
                                {hasUnsignedReports ? 'Firma de Reportes' : generatedZip ? 'Paquete ZIP Listo' : 'Generando Paquete ZIP'}
                            </h3>
                        </div>
                        <p className="text-xs text-[#E8DCCF]/80 mb-4 leading-relaxed">
                            {hasUnsignedReports
                                ? `Para empaquetar los ${activeReports.length} reportes musicales en un archivo ZIP, todos deben estar firmados digitalmente.`
                                : `Empaquetado de los ${activeReports.length} reportes musicales de la pantalla principal.`}
                        </p>

                        {/* Bloque de aviso y acción si hay reportes sin firmar */}
                        {hasUnsignedReports ? (
                            <div className="space-y-4">
                                <div className="bg-[#1A100C] p-3 rounded-xl border border-[#9E7649]/20 max-h-48 overflow-y-auto space-y-2">
                                    {activeReports.map((r) => (
                                        <div key={r.id} className="flex items-center justify-between text-xs text-[#E8DCCF]/80 border-b border-[#9E7649]/10 pb-1.5 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2 truncate mr-2">
                                                <span className="material-symbols-outlined text-xs text-red-400">picture_as_pdf</span>
                                                <span className="truncate">{r.fileName || r.program}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {r.status?.signed ? (
                                                    <span className="text-[10px] text-yellow-400 font-bold">Firmado</span>
                                                ) : (
                                                    <span className="text-[10px] text-rose-400 font-bold">Sin firmar</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-yellow-950/40 border border-yellow-500/50 rounded-xl p-3.5 shadow-inner animate-fade-in">
                                    <div className="flex items-start gap-2.5">
                                        <span className="material-symbols-outlined text-yellow-400 text-xl shrink-0 mt-0.5 animate-pulse">lock</span>
                                        <div className="text-xs">
                                            <p className="font-bold text-yellow-300">Firma digital obligatoria</p>
                                            <p className="text-[#E8DCCF]/90 mt-0.5 leading-relaxed text-[11px]">
                                                Hay <strong>{unsignedReports.length} {unsignedReports.length === 1 ? 'reporte sin firmar' : 'reportes sin firmar'}</strong>. Fírmelos para iniciar de inmediato la generación del archivo ZIP.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSigningMode('all');
                                            setShowSignDialog(true);
                                        }}
                                        className="w-full mt-3 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer hover:scale-[1.01]"
                                    >
                                        <span className="material-symbols-outlined text-base">draw</span>
                                        Firmar los {unsignedReports.length} {unsignedReports.length === 1 ? 'reporte pendiente' : 'reportes pendientes'}
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setShowZipModal(false)}
                                    className="w-full py-2.5 text-[#E8DCCF]/60 hover:text-white transition-colors text-center text-xs mt-1"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : isZipping || !generatedZip ? (
                            /* BARRA DE PROGRESO DE GENERACIÓN DEL ZIP */
                            <div className="space-y-4 py-2">
                                <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/30 shadow-inner space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-amber-400 font-medium truncate mr-2 flex items-center gap-1.5">
                                            <span className="inline-block size-2 rounded-full bg-amber-400 animate-ping"></span>
                                            {zipStatusText || 'Empaquetando reportes en ZIP...'}
                                        </span>
                                        <span className="text-white font-bold text-sm shrink-0">{zipProgress}%</span>
                                    </div>
                                    <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden border border-[#9E7649]/40 p-0.5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 rounded-full transition-all duration-300 shadow-sm"
                                            style={{ width: `${Math.max(5, zipProgress)}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-[#E8DCCF]/60 text-center animate-pulse">
                                        Compilando reportes y comprimiendo archivo ZIP...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* CULMINACIÓN: ARCHIVO LISTO + OPCIONES DE DESCARGAR O COMPARTIR */
                            <div className="space-y-4">
                                {/* Tarjeta del archivo generado */}
                                <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/30 flex items-center gap-3.5 shadow-inner">
                                    <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                                        <span className="material-symbols-outlined text-2xl">folder_zip</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate" title={generatedZip.fileName}>
                                            {generatedZip.fileName}
                                        </h4>
                                        <p className="text-[11px] text-[#E8DCCF]/70 flex items-center gap-2 mt-0.5">
                                            <span>{generatedZip.count} reportes</span>
                                            <span>•</span>
                                            <span className="text-amber-300 font-semibold">{generatedZip.fileSizeStr}</span>
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                        Listo
                                    </span>
                                </div>

                                <div className="bg-[#9E7649]/10 p-2.5 rounded-xl border border-[#9E7649]/20 text-[11px] text-[#E8DCCF]/70 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-400 text-base">info</span>
                                    <span>
                                        {isMobile
                                            ? 'Archivo ZIP generado. Puede descargarlo o compartirlo con las aplicaciones de su móvil.'
                                            : 'Archivo ZIP generado y listo para descargar en su computadora.'}
                                    </span>
                                </div>

                                {/* Botones de acción según el dispositivo (PC solo descargar; Móvil descargar y compartir) */}
                                <div className="flex flex-col gap-2 font-bold text-xs pt-1">
                                    <button 
                                        onClick={handleDownloadZipFile}
                                        className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider cursor-pointer hover:scale-[1.01]"
                                        title="Descargar paquete ZIP en Descargas del dispositivo"
                                    >
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Descargar
                                    </button>
                                    
                                    {isMobile && (
                                        <button 
                                            onClick={handleShareZip}
                                            className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider cursor-pointer hover:scale-[1.01]"
                                            title="Compartir archivo ZIP (WhatsApp, Telegram, Gmail, etc.)"
                                        >
                                            <span className="material-symbols-outlined text-lg">share</span>
                                            Compartir
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => setShowZipModal(false)}
                                        className="w-full py-2.5 text-[#E8DCCF]/60 hover:text-white transition-colors text-center text-xs mt-1 cursor-pointer"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Consulta Completa de Reporte (Para Archivo y Activos) */}
            {consultingReport && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConsultingReport(null)}>
                    <div className="bg-[#2C1B15] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 font-sans max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-3 border-b border-[#9E7649]/20 mb-4">
                            <div className="flex items-center gap-2 text-white">
                                <span className="material-symbols-outlined text-[#9E7649]">description</span>
                                <h3 className="text-base font-bold truncate">Consulta de Reporte Musical</h3>
                            </div>
                            <button onClick={() => setConsultingReport(null)} className="text-[#E8DCCF]/40 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                            <div className="bg-[#1A100C] p-3.5 rounded-xl border border-[#9E7649]/20 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#E8DCCF]/60">Archivo:</span>
                                    <span className="font-bold text-white truncate max-w-[250px]">{consultingReport.fileName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#E8DCCF]/60">Programa:</span>
                                    <span className="font-bold text-white">{consultingReport.program}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#E8DCCF]/60">Fecha:</span>
                                    <span className="font-bold text-white">{consultingReport.date.split('T')[0]}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#E8DCCF]/60">Generado por:</span>
                                    <span className="font-bold text-[#E8DCCF]">{consultingReport.generatedBy}</span>
                                </div>
                            </div>

                            <div className="bg-[#1A100C] p-3.5 rounded-xl border border-[#9E7649]/20 space-y-2">
                                <h4 className="font-bold text-[#9E7649] uppercase tracking-wider text-[10px]">Propiedades y Estado</h4>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-yellow-500">draw</span>
                                        <span>Firma:</span>
                                        <span className={`font-bold ${consultingReport.status?.signed ? 'text-yellow-400' : 'text-[#E8DCCF]/40'}`}>
                                            {consultingReport.status?.signed ? 'Firmado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-[#25D366]">send</span>
                                        <span>WhatsApp:</span>
                                        <span className={`font-bold ${consultingReport.status?.sent ? 'text-[#25D366]' : 'text-[#E8DCCF]/40'}`}>
                                            {consultingReport.status?.sent ? 'Enviado' : 'No enviado'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-blue-400">download</span>
                                        <span>Descargado:</span>
                                        <span className={`font-bold ${consultingReport.status?.downloaded ? 'text-blue-400' : 'text-[#E8DCCF]/40'}`}>
                                            {consultingReport.status?.downloaded ? 'Sí' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-amber-500">inventory_2</span>
                                        <span>Ubicación:</span>
                                        <span className="font-bold text-amber-300">
                                            {isMonthConcluded(consultingReport.date) ? 'Mes concluido' : consultingReport.archived ? 'Archivado adel.' : 'Activo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Obras y Créditos incluidos */}
                            <div className="bg-[#1A100C] p-3.5 rounded-xl border border-[#9E7649]/20">
                                <h4 className="font-bold text-[#9E7649] uppercase tracking-wider text-[10px] mb-2">
                                    Obras y Créditos Registrados ({consultingReport.items?.length || 0})
                                </h4>
                                {consultingReport.items && consultingReport.items.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                        {consultingReport.items.map((item, idx) => (
                                            <div key={item.id || idx} className="bg-[#2C1B15] p-2 rounded-lg text-[11px] flex justify-between items-center border border-[#9E7649]/10">
                                                <div className="truncate mr-2">
                                                    <span className="font-bold text-white">{idx + 1}. {item.title}</span>
                                                    <span className="text-[#E8DCCF]/60 ml-1.5">({item.performer})</span>
                                                </div>
                                                <span className="text-[10px] text-[#E8DCCF]/40 shrink-0">{item.genre || 'Música'}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-[#E8DCCF]/40 italic">No hay desglose de temas musicales guardado.</p>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción del reporte consultado */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#9E7649]/20 mt-4 font-bold text-xs">
                            {consultingReport.pdfBlob && (
                                <button 
                                    onClick={() => {
                                        const url = URL.createObjectURL(consultingReport.pdfBlob);
                                        window.open(url, '_blank');
                                    }}
                                    className="flex-1 py-2.5 bg-[#1A100C] border border-[#9E7649]/40 hover:bg-[#3E1E16] text-[#E8DCCF] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    <span>Ver PDF</span>
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    const rep = consultingReport;
                                    setConsultingReport(null);
                                    onEdit(rep);
                                }}
                                className="flex-1 py-2.5 bg-[#1A100C] border border-[#9E7649]/40 hover:bg-[#3E1E16] text-[#E8DCCF] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">edit_document</span>
                                <span>Editar</span>
                            </button>

                            <button 
                                onClick={() => {
                                    const rep = consultingReport;
                                    setConsultingReport(null);
                                    handleDownload(rep);
                                }}
                                className="flex-1 py-2.5 bg-blue-700/80 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                <span>Descargar</span>
                            </button>

                            <button 
                                onClick={async () => {
                                    const rep = consultingReport;
                                    setConsultingReport(null);
                                    if (!rep.status?.signed) {
                                        showAlert("No se puede enviar un reporte sin firmar. Por favor, fírmelo digitalmente primero.");
                                        setPostSignAction({ type: 'whatsapp', reportId: rep.id });
                                        setSigningMode('single');
                                        setSigningReport(rep);
                                        setShowSignDialog(true);
                                        return;
                                    }
                                    await triggerSendWhatsApp(rep);
                                }}
                                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl flex items-center justify-center gap-1.5 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">send</span>
                                <span>WhatsApp</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Resumen Estadístico */}
            {showSummary && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSummary(false)}>
                    <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl shadow-xl p-6 border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b border-[#9E7649]/20 pb-2">
                             <h3 className="text-lg font-bold text-white">Resumen Estadístico</h3>
                             <button onClick={() => setShowSummary(false)} className="text-[#E8DCCF]/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[#E8DCCF]/60 text-left border-b border-[#9E7649]/20">
                                        <th className="py-2 font-bold">Programa</th>
                                        <th className="py-2 font-bold text-center">Gen.</th>
                                        <th className="py-2 font-bold text-center">Desc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryData.map(row => (
                                        <tr key={row.program} className="border-b border-[#9E7649]/10 last:border-0">
                                            <td className="py-2 font-medium text-[#E8DCCF] pr-2">{row.program}</td>
                                            <td className="py-2 text-center text-[#E8DCCF]/60">{row.total}</td>
                                            <td className="py-2 text-center text-blue-400 font-bold">{row.downloaded}</td>
                                        </tr>
                                    ))}
                                    {summaryData.length === 0 && (
                                        <tr><td colSpan={3} className="py-4 text-center text-[#E8DCCF]/40">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Firma Digital */}
            {showSignDialog && (signingMode === 'all' || signingReport) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSignDialog(false)}>
                    <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-yellow-500 mb-4">
                            <span className="material-symbols-outlined text-3xl">draw</span>
                            <h3 className="text-xl font-bold text-white">
                                {signingMode === 'all' ? `Firmar ${activeReports.filter(r => !r.status?.signed).length} Reportes` : 'Firmar Reporte'}
                            </h3>
                        </div>
                        <p className="text-xs text-[#E8DCCF]/60 mb-6 font-semibold leading-relaxed">
                             {signingMode === 'all' ? (
                                 <>Para estampar su firma digital en <strong>{activeReports.filter(r => !r.status?.signed).length} reportes pendientes</strong>, por favor ingrese su contraseña de certificado:</>
                             ) : (
                                 <>Para estampar su firma digital en el reporte <strong>{signingReport?.program}</strong> del día <strong>{signingReport?.date.split('T')[0]}</strong>, por favor ingrese su contraseña de certificado:</>
                             )}
                        </p>
                        
                        <div className="mb-6">
                            <label className="text-[10px] text-[#E8DCCF]/40 uppercase tracking-wider mb-2 block font-bold">Contraseña de Certificado</label>
                            <input 
                                type="password" 
                                value={signPass}
                                onChange={(e) => setSignPass(e.target.value)}
                                className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white text-center tracking-[0.5em] font-mono focus:border-yellow-500/50 outline-none transition-colors text-sm"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2 font-bold text-xs uppercase">
                            <button onClick={() => setShowSignDialog(false)} className="flex-1 py-3 rounded-xl border border-white/5 text-white hover:bg-white/5 transition-colors">CANCELAR</button>
                            <button onClick={confirmSignReport} className="flex-1 py-3 rounded-xl bg-yellow-600 text-white hover:bg-yellow-500 transition-colors">
                                {signingMode === 'all' ? 'FIRMAR TODOS' : 'FIRMAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    confirmSignReport();
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
                                    confirmSignReport();
                                }}
                                className="w-full py-2 bg-transparent text-stone-400 hover:text-white font-semibold rounded-xl transition-all text-[10px] uppercase underline"
                            >
                                No mostrar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para archivar reportes de meses concluidos al entrar */}
            {showConcludedPrompt && concludedUnarchivedReports.length > 0 && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowConcludedPrompt(false)}>
                    <div className="bg-[#2C1B15] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-amber-400 mb-3">
                            <span className="material-symbols-outlined text-3xl">history_toggle_off</span>
                            <h3 className="text-lg font-bold text-white">Reportes de Meses Concluidos</h3>
                        </div>
                        <p className="text-xs text-[#E8DCCF]/90 leading-relaxed mb-4">
                            Se han detectado <strong>{concludedUnarchivedReports.length} {concludedUnarchivedReports.length === 1 ? 'reporte' : 'reportes'}</strong> en la pantalla principal pertenecientes a meses ya concluidos.
                        </p>
                        
                        <div className="bg-[#1A100C] p-3 rounded-xl border border-[#9E7649]/20 max-h-40 overflow-y-auto mb-4 space-y-1.5 text-xs text-[#E8DCCF]/80">
                            {concludedUnarchivedReports.map(r => (
                                <div key={r.id} className="flex justify-between items-center py-1 border-b border-[#9E7649]/10 last:border-0">
                                    <span className="font-semibold truncate mr-2">{r.program}</span>
                                    <span className="text-[11px] text-[#E8DCCF]/50 shrink-0">{r.date.split('T')[0]}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-amber-200/90 font-medium mb-5">
                            ¿Deseas enviar estos reportes al Archivo ahora para mantener organizada la pantalla de reportes activos?
                        </p>

                        <div className="flex flex-col gap-2 font-bold text-xs uppercase tracking-wider">
                            <button
                                onClick={handleArchiveConcludedReports}
                                className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                            >
                                <span className="material-symbols-outlined text-base">inventory_2</span>
                                Sí, Enviar al Archivo ({concludedUnarchivedReports.length})
                            </button>
                            <button
                                onClick={() => setShowConcludedPrompt(false)}
                                className="w-full py-2.5 text-[#E8DCCF]/60 hover:text-white transition-colors text-center text-xs"
                            >
                                Mantener en Pantalla Principal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación para pasar reportes a Archivo tras generar ZIP */}
            {showPostZipArchivePrompt.show && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowPostZipArchivePrompt({ show: false, reportsToArchive: [], message: '' })}>
                    <div className="bg-[#2C1B15] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-amber-400 mb-3">
                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                            <h3 className="text-lg font-bold text-white">¿Pasar Reportes al Archivo?</h3>
                        </div>
                        <p className="text-xs text-[#E8DCCF]/90 leading-relaxed mb-5 whitespace-pre-line">
                            {showPostZipArchivePrompt.message || `El paquete ZIP de los reportes se ha procesado con éxito.\n\n¿Deseas pasar estos ${showPostZipArchivePrompt.reportsToArchive.length} reportes empaquetados para el Archivo?`}
                        </p>

                        <div className="flex flex-col gap-2 font-bold text-xs uppercase tracking-wider">
                            <button
                                onClick={handleConfirmPostZipArchive}
                                className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                            >
                                <span className="material-symbols-outlined text-base">inventory_2</span>
                                Sí, Pasar al Archivo ({showPostZipArchivePrompt.reportsToArchive.length})
                            </button>
                            <button
                                onClick={() => setShowPostZipArchivePrompt({ show: false, reportsToArchive: [], message: '' })}
                                className="w-full py-2.5 text-[#E8DCCF]/60 hover:text-white transition-colors text-center text-xs"
                            >
                                Mantener en Reportes Activos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert Overlay Modal perfectly aligned to the director's screen view */}
            {customAlert && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCustomAlert(null)}>
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

export default ReportsViewer;
