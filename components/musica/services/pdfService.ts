import { jsPDF } from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';
import { formatDigitalSignatureForDocuments } from "../../../utils/signatureUtils";

const pdfjs = pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js`;
} else {
    console.warn("PDF.js GlobalWorkerOptions no encontrado, la lectura de PDF podría fallar.");
}

interface ReportData {
    userFullName: string;
    userUniqueId: string;
    program: string;
    date: string;
    items: {
        title: string;
        author: string;
        authorCountry: string;
        performer: string;
        performerCountry: string;
        genre: string;
    }[];
}

export const generateReportPDF = (data: ReportData): Blob => {
    const JsPDFCtor = (jsPDF as any).default || jsPDF;
    const doc = new JsPDFCtor();
    
    // Format date for display inside PDF
    let displayDate = data.date;
    try {
        // If it's YYYY-MM-DD, we want to show it as is or formatted nicely
        if (data.date.includes('-')) {
            const [y, m, d] = data.date.split('T')[0].split('-');
            displayDate = `${d}/${m}/${y}`;
        }
    } catch (e) {
        displayDate = data.date;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE OFICIAL DE CRÉDITOS MUSICALES", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("CMNL RADIO CIUDAD MONUMENTO", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Director(a): ${data.userFullName}`, 20, 45);
    doc.text(`Fecha: ${displayDate}`, 20, 50);
    doc.text(`Programa: ${data.program || 'Sin Especificar'}`, 20, 55);

    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    let y = 70;
    const pageHeight = doc.internal.pageSize.height;

    data.items.forEach((item, index) => {
        if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`[${index + 1}] ${item.title}`, 20, y);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        y += 5;
        
        const details = [
            `Autor: ${item.author || '---'} (${item.authorCountry || '-'})`,
            `Intérprete: ${item.performer || '---'} (${item.performerCountry || '-'})`,
            `Género: ${item.genre || '---'}`
        ];

        details.forEach(line => {
             doc.text(line, 25, y);
             y += 5;
        });
        
        y += 3;
    });

    if (y > pageHeight - 40) {
        doc.addPage();
        y = 40;
    } else {
        y += 20;
    }
    
    doc.setLineWidth(0.5);
    doc.line(110, y, 190, y);
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    const sigLines = formatDigitalSignatureForDocuments(data.userUniqueId);
    if (sigLines.length > 0) {
        doc.text(`Firma Digital: ${sigLines[0]}`, 190, y + 6, { align: "right" });
        if (sigLines[1]) doc.text(sigLines[1], 190, y + 10, { align: "right" });
        if (sigLines[2]) doc.text(sigLines[2], 190, y + 14, { align: "right" });
        if (sigLines[3]) doc.text(sigLines[3], 190, y + 18, { align: "right" });
    }

    return doc.output('blob');
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const items = textContent.items as any[];
            
            // Group text fragments by similar Y coordinate (tolerance of 4 points)
            const linesMap: { [y: number]: any[] } = {};
            items.forEach(item => {
                if (!item.transform) return;
                const y = Math.round(item.transform[5]);
                // Search for any existing line key within a tolerance margin
                const foundYKey = Object.keys(linesMap).find(k => Math.abs(Number(k) - y) < 4);
                if (foundYKey) {
                    linesMap[Number(foundYKey)].push(item);
                } else {
                    linesMap[y] = [item];
                }
            });

            // Sort lines top-to-bottom (descending Y value)
            const sortedYKeys = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
            const pageLines = sortedYKeys.map(y => {
                // Sort items inside the line from left-to-right (ascending X value: transform[4])
                const lineItems = linesMap[y].sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
                return lineItems.map(item => item.str).join(' ');
            });

            fullText += pageLines.join('\n') + '\n';
        }

        return fullText;
    } catch (e) {
        console.error("Error leyendo PDF:", e);
        throw new Error("No se pudo leer el archivo PDF.");
    }
};
