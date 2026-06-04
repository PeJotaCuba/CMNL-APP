import React, { useEffect, useState } from 'react';
import { Report, User } from './types';
import { loadReportsFromDB, deleteReportFromDB, updateReportStatus, clearReportsDB, saveReportToDB } from './services/db';
import { openWhatsApp } from '../../utils/whatsappUtils';
import { generateReportPDF } from './services/pdfService';
import { getStoredPassword, getStoredCertificate, generateDigitalSignature } from '../../utils/signatureUtils';
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
    
    // Signing state
    const [signingReport, setSigningReport] = useState<Report | null>(null);
    const [signPass, setSignPass] = useState('');
    const [showSignDialog, setShowSignDialog] = useState(false);
    const [signingMode, setSigningMode] = useState<'single' | 'all'>('single');

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
        const unsigned = reports.filter(r => !r.status?.signed);
        if (unsigned.length === 0) {
            alert("No hay reportes pendientes de firma.");
            return;
        }
        setSigningMode('all');
        setShowSignDialog(true);
    };

    const confirmSignReport = async () => {
        if (!currentUser) return;
        if (signingMode === 'single' && !signingReport) return;
        
        const globalUserId = (currentUser as any).id || currentUser.username;
        const storedPass = getStoredPassword(globalUserId);
        const cert = getStoredCertificate(globalUserId);
        
        if (!cert) {
            alert("No tiene un certificado de firma digital cargado en este equipo.");
            return;
        }

        const effectivePass = (cert && cert.originalPassword) ? cert.originalPassword : storedPass;

        if (cert.validUntil && new Date(cert.validUntil).getTime() < Date.now()) {
            alert("Su certificado ha caducado. Venció el " + new Date(cert.validUntil).toLocaleDateString() + ". Solicite una renovación con el administrador para poder firmar.");
            return;
        }

        if (signPass !== effectivePass) {
            alert("Contraseña original incorrecta o equipo no certificado.");
            return;
        }

        const signature = generateDigitalSignature(cert);
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
            alert("Reporte firmado correctamente con su certificado digital.");
        } else if (signingMode === 'all') {
            const unsigned = reports.filter(r => !r.status?.signed);
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
                } catch(e) {
                    console.error("Error signing report", r.id, e);
                }
            }
            
            setReports(newReports);
            alert(`Se firmaron correctamente ${successCount} reportes.`);
        }
        
        setShowSignDialog(false);
        setSigningReport(null);
        setSignPass('');
    };

    const handleSendAll = async () => {
        // Encontrar reportes firmados
        const signedReports = reports.filter(r => r.status?.signed);
        
        if (signedReports.length === 0) {
            alert("No hay ningún reporte firmado para enviar. Firme al menos un reporte primero.");
            return;
        }

        const pendingReports = signedReports.filter(r => !r.status?.sent);
        let toSend = pendingReports;

        if (toSend.length === 0) {
            if (window.confirm("Todos los reportes firmados ya fueron enviados anteriormente. ¿Desea volver a enviarlos todos?")) {
                toSend = signedReports;
            } else {
                return;
            }
        }

        const adminUser = users.find(u => u.role === 'admin' || u.classification === 'Administrador');
        let phone = adminUser?.phone || adminUser?.mobile || '54413935';
        
        if (!phone) {
            alert('No se encontró el número de teléfono del administrador.');
            return;
        }

        if (!phone.startsWith('53')) {
            phone = '53' + phone;
        }

        // Construir el texto acumulado
        let text = `Hola Administrador, adjunto los reportes musicales firmados para su revisión.\n\n`;
        const files: File[] = [];

        toSend.forEach((report, index) => {
            const datePart = report.date.split('T')[0];
            const safeProgram = report.program.replace(/[^a-zA-Z0-9]/g, '-');
            const fileName = `PM-${safeProgram}-${datePart}.pdf`;

            text += `*${index + 1}. ${report.program}* (${datePart})\n`;
            text += `Firmado por: ${report.generatedBy}\n`;
            if (report.items && report.items.length > 0) {
                text += `Créditos (${report.items.length}):\n`;
                report.items.forEach((item, itemIndex) => {
                    text += `  • ${item.title} - ${item.performer}\n`;
                });
            }
            text += `\n`;

            if (report.pdfBlob) {
                const file = new File([report.pdfBlob], fileName, { type: 'application/pdf' });
                files.push(file);
            }
        });

        // Intentar compartir los archivos si la API de compartir está disponible y soporta envío de archivos
        if (files.length > 0 && navigator.share) {
            try {
                if (navigator.canShare && navigator.canShare({ files })) {
                    await navigator.share({
                        files: files,
                        title: 'Reportes Musicales Firmados',
                        text: text
                    });

                    // Actualizar estado de envío en la base de datos
                    for (const r of toSend) {
                        await updateReportStatus(r.id, { sent: true });
                    }
                    
                    setReports(prev => prev.map(r => {
                        const found = toSend.find(ts => ts.id === r.id);
                        if (found) {
                            return { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } };
                        }
                        return r;
                    }));
                    return;
                }
            } catch (shareError: any) {
                if (shareError.name !== 'AbortError') {
                    console.warn("Fallo compartición nativa de múltiples archivos, usando fallback:", shareError);
                } else {
                    // El usuario canceló la opción de compartir
                    return;
                }
            }
        }

        // Fallback directo a WhatsApp
        openWhatsApp(text, phone);

        // Actualizar estado de envío en la base de datos
        for (const r of toSend) {
            await updateReportStatus(r.id, { sent: true });
        }
        
        setReports(prev => prev.map(r => {
            const found = toSend.find(ts => ts.id === r.id);
            if (found) {
                return { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } };
            }
            return r;
        }));
    };

    const loadData = async () => {
        setIsLoading(true);
        const filterUser = currentUser ? currentUser.username : undefined;
        const data = await loadReportsFromDB(filterUser);
        setReports(data);
        setIsLoading(false);
    };

    const handleDownload = async (report: Report) => {
        if (!report.status?.signed) {
            alert("Debe firmar digitalmente el reporte antes de descargarlo.");
            setSigningMode('single');
            setSigningReport(report);
            setShowSignDialog(true);
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

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este reporte permanentemente?")) {
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
        
        reports.forEach(r => {
            if (!stats[r.program]) {
                stats[r.program] = { total: 0, downloaded: 0 };
            }
            stats[r.program].total++;
            if (r.status?.downloaded) stats[r.program].downloaded++;
        });
        
        return Object.entries(stats).map(([program, data]) => ({ program, ...data }));
    }, [reports]);

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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9E7649]">description</span>
                    Reportes Musicales
                </h2>
                {reports.length > 0 && (
                    <button 
                        onClick={() => setShowSummary(true)}
                        className="text-[#9E7649] hover:text-[#BCA387] flex items-center gap-1.5 text-xs font-bold transition-all"
                        title="Ver resumen estadístico"
                    >
                        <span className="material-symbols-outlined text-sm">analytics</span>
                        <span className="hidden sm:inline">Resumen</span>
                    </button>
                )}
            </div>

            {/* Contenedor de Botones de Acción (Reacomodados debajo del título y con Enviar todo) */}
            <div className="flex gap-2 w-full mb-6 bg-[#2C1B15]/30 p-2 rounded-2xl border border-[#9E7649]/15">
                {/* Firmar Todo */}
                {currentUser?.role === 'director' && (
                    <button 
                        onClick={handleSignAllClick}
                        disabled={!reports.some(r => !r.status?.signed)}
                        className={`flex-1 min-w-[48px] py-3 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs font-bold transition-all shadow-md ${
                            reports.some(r => !r.status?.signed) 
                                ? 'bg-yellow-600 text-white hover:bg-yellow-500 hover:scale-[1.01] cursor-pointer' 
                                : 'bg-yellow-900/10 text-yellow-600/40 border border-yellow-950/20 cursor-not-allowed'
                        }`}
                        title={reports.some(r => !r.status?.signed) ? "Firmar todos los reportes pendientes" : "No hay reportes pendientes de firma"}
                    >
                        <span className="material-symbols-outlined text-lg">draw</span>
                        <span className="hidden sm:inline">Firmar todo</span>
                    </button>
                )}

                {/* Firma Por Carga */}
                <button 
                    onClick={() => setShowBatchSigner(true)}
                    className="flex-1 min-w-[48px] py-3 px-1 bg-[#9E7649] text-white text-xs font-bold rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-[#8B653D] hover:scale-[1.01] transition-all shadow-md"
                    title="Cargar firmas en lote"
                >
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                    <span className="hidden sm:inline">Firma por carga</span>
                </button>

                {/* Enviar Todo */}
                <button 
                    onClick={handleSendAll}
                    disabled={!reports.some(r => r.status?.signed)}
                    className={`flex-1 min-w-[48px] py-3 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs font-bold transition-all shadow-md ${
                        reports.some(r => r.status?.signed)
                            ? 'bg-[#25D366] text-white hover:bg-[#20ba5a] hover:scale-[1.01] cursor-pointer'
                            : 'bg-green-950/10 text-green-600/30 border border-green-950/25 cursor-not-allowed'
                    }`}
                    title={reports.some(r => r.status?.signed) ? "Enviar todos los reportes firmados a WhatsApp" : "Firme al menos un reporte antes de enviar"}
                >
                    <span className="material-symbols-outlined text-lg">send</span>
                    <span className="hidden sm:inline">Enviar todo</span>
                </button>

                {/* Limpiar */}
                {reports.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        className="flex-1 min-w-[48px] py-3 px-1 bg-red-950/20 text-red-400 border border-red-900/10 text-xs font-bold rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 hover:bg-red-900/20 hover:scale-[1.01] transition-all shadow-md"
                        title="Borrar TODOS los reportes"
                    >
                        <span className="material-symbols-outlined text-lg">delete_sweep</span>
                        <span className="hidden sm:inline">Limpiar</span>
                    </button>
                )}
            </div>

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
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#E8DCCF]/40">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_off</span>
                    <p>No hay reportes generados.</p>
                    <p className="text-xs mt-2">Los reportes generados en la sección de Selección aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm flex flex-col gap-3 group hover:border-[#9E7649]/50 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 flex gap-1">
                                {report.status?.sent && <span title="Enviado por WhatsApp" className="size-2 rounded-full bg-[#25D366]"></span>}
                                {report.status?.downloaded && <span title="Descargado" className="size-2 rounded-full bg-blue-500"></span>}
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

                                {(!report.status?.signed) ? (
                                    <button 
                                        onClick={() => {
                                            setSigningMode('single');
                                            setSigningReport(report);
                                            setShowSignDialog(true);
                                        }}
                                        className="size-8 rounded-full bg-[#1A100C] text-yellow-500 hover:bg-yellow-500 hover:text-white transition-colors flex items-center justify-center"
                                        title="Firmar con Estampado"
                                    >
                                        <span className="material-symbols-outlined text-sm">draw</span>
                                    </button>
                                ) : (
                                    <div className="size-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center" title="Reporte Firmado">
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                    </div>
                                )}

                                <button 
                                    onClick={async () => {
                                        if (!report.status?.signed) {
                                            alert("Debe firmar digitalmente el reporte antes de enviarlo por WhatsApp.");
                                            setSigningMode('single');
                                            setSigningReport(report);
                                            setShowSignDialog(true);
                                            return;
                                        }

                                        const adminUser = users.find(u => u.role === 'admin' || u.classification === 'Administrador');
                                        let phone = adminUser?.phone || adminUser?.mobile || '54413935';
                                        
                                        if (!phone) {
                                            alert('No se encontró el número de teléfono del administrador.');
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
                                        
                                        // Attempt to share the PDF file if available
                                        if (report.pdfBlob && navigator.share) {
                                            try {
                                                const file = new File([report.pdfBlob], fileName, { type: 'application/pdf' });
                                                
                                                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                    await navigator.share({
                                                        files: [file],
                                                        title: `Reporte Musical: ${report.program}`,
                                                        text: text
                                                    });
                                                    
                                                    await updateReportStatus(report.id, { sent: true });
                                                    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } } : r));
                                                    return;
                                                }
                                            } catch (shareError: any) {
                                                if (shareError.name !== 'AbortError') {
                                                    console.warn("Error share API:", shareError);
                                                } else {
                                                    // User cancelled
                                                    return;
                                                }
                                            }
                                        }

                                        // Direct fallback redirect to WhatsApp if share API fails or not supported
                                        openWhatsApp(text, phone);
                                        
                                        await updateReportStatus(report.id, { sent: true });
                                        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } } : r));
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
                                <button 
                                    onClick={() => handleDelete(report.id)}
                                    className="size-8 rounded-full bg-[#1A100C] text-[#E8DCCF]/40 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                    title="Eliminar"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSummary(false)}>
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

            {showSignDialog && (signingMode === 'all' || signingReport) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSignDialog(false)}>
                    <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-yellow-500 mb-4">
                            <span className="material-symbols-outlined text-3xl">draw</span>
                            <h3 className="text-xl font-bold text-white">
                                {signingMode === 'all' ? `Firmar ${reports.filter(r => !r.status?.signed).length} Reportes` : 'Firmar Reporte'}
                            </h3>
                        </div>
                        <p className="text-xs text-[#E8DCCF]/60 mb-6">
                            {signingMode === 'all' ? (
                                <>Para estampar su firma digital en <strong>{reports.filter(r => !r.status?.signed).length} reportes pendientes</strong>, por favor ingrese su contraseña de certificado:</>
                            ) : (
                                <>Para estampar su firma digital en el reporte <strong>{signingReport?.program}</strong> del día <strong>{signingReport?.date.split('T')[0]}</strong>, por favor ingrese su contraseña de certificado:</>
                            )}
                        </p>
                        
                        <div className="mb-6">
                            <label className="text-[10px] text-[#E8DCCF]/40 uppercase tracking-wider mb-2 block">Contraseña de Certificado</label>
                            <input 
                                type="password" 
                                value={signPass}
                                onChange={(e) => setSignPass(e.target.value)}
                                className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded-xl p-3 text-white text-center tracking-[0.5em] font-mono focus:border-yellow-500/50 outline-none transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowSignDialog(false)} className="flex-1 py-3 rounded-xl border border-white/5 text-white text-xs font-bold hover:bg-white/5 transition-colors">CANCELAR</button>
                            <button onClick={confirmSignReport} className="flex-1 py-3 rounded-xl bg-yellow-600 text-white text-xs font-bold hover:bg-yellow-500 transition-colors">
                                {signingMode === 'all' ? 'FIRMAR TODOS' : 'FIRMAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsViewer;
