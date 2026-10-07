import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * reportExporter.js — Motor Full-Stack de Exportación de Reportes UrbanStep
 * Genera reportes profesionales en Excel (.xlsx) y PDF corporativo (.pdf)
 */

const formatUSD = (val) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatBs = (val) => `Bs. ${Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const reportExporter = {
    /**
     * Exporta cualquier reporte a Excel (.xlsx) estructurado
     */
    exportToExcel: ({ reportTitle, categoryName, columns, rows, summaryCards = [], bcvRate = 42.50, filename }) => {
        const wb = XLSX.utils.book_new();

        const sheetData = [];

        // Encabezado Corporativo
        sheetData.push(['URBANSTEP VENEZUELA C.A.']);
        sheetData.push([`RIF: J-50123456-7 • Av. Los Leones, C.C. Las Trinitarias, Barquisimeto, Edo. Lara`]);
        sheetData.push([`REPORTE: ${reportTitle.toUpperCase()} (${categoryName.toUpperCase()})`]);
        sheetData.push([
            `Fecha de Emisión: ${new Date().toLocaleString('es-VE')}`,
            '',
            `Tasa Oficial BCV: ${Number(bcvRate).toFixed(2)} VES/USD`,
            '',
            `Moneda: Dual USD / VES`
        ]);
        sheetData.push([]); // Fila vacía

        // Tarjetas de Resumen / KPIs
        if (summaryCards && summaryCards.length > 0) {
            sheetData.push(['RESUMEN EJECUTIVO DE INDICADORES (KPIs):']);
            const kpiLabels = summaryCards.map(c => c.label);
            const kpiValues = summaryCards.map(c => c.value);
            sheetData.push(kpiLabels);
            sheetData.push(kpiValues);
            sheetData.push([]); // Fila vacía
        }

        // Encabezados de la Tabla
        sheetData.push(columns.map(c => c.header.toUpperCase()));

        // Renglones de Datos
        rows.forEach(r => {
            const rowValues = columns.map(c => {
                const raw = r[c.key];
                return raw !== undefined && raw !== null ? raw : '—';
            });
            sheetData.push(rowValues);
        });

        // Fila de Pie / Nota SENIAT
        sheetData.push([]);
        sheetData.push(['Sistema Administrativo y POS UrbanStep • Información para uso contable, administrativo y fiscal SENIAT']);

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Configuración de anchos de columna automáticos
        ws['!cols'] = columns.map(() => ({ wch: 22 }));

        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        XLSX.writeFile(wb, `${filename || 'reporte_urbanstep'}.xlsx`);
    },

    /**
     * Exporta cualquier reporte a PDF corporativo con jsPDF y autoTable
     */
    exportToPDF: ({ reportTitle, categoryName, columns, rows, summaryCards = [], bcvRate = 42.50, filename, orientation = 'landscape' }) => {
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Banner Superior Corporativo (Azul Marino Profundo)
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Acento en Gradiente / Azul Real
        doc.setFillColor(37, 99, 235); // blue-600
        doc.rect(0, 28, pageWidth, 2, 'F');

        // Título del Sistema
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('URBANSTEP VENEZUELA', 14, 11);

        // Subtítulo y Datos Fiscales
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('Retail de Calzado Urbano • RIF: J-50123456-7 • Barquisimeto, Edo. Lara', 14, 17);
        doc.text(`Tasa Oficial BCV: ${Number(bcvRate).toFixed(2)} VES/USD • Multimoneda Dual`, 14, 22);

        // Información de emisión a la derecha
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`REPORTE: ${categoryName.toUpperCase()}`, pageWidth - 14, 11, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);
        doc.text(`Emisión: ${new Date().toLocaleString('es-VE')}`, pageWidth - 14, 17, { align: 'right' });
        doc.text('Validez: Documento Administrativo', pageWidth - 14, 22, { align: 'right' });

        // 2. Título Principal del Reporte
        let currentY = 36;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTitle, 14, currentY);

        currentY += 4;

        // 3. Tarjetas de Resumen / KPIs en el PDF
        if (summaryCards && summaryCards.length > 0) {
            currentY += 2;
            const cardWidth = Math.min(60, (pageWidth - 28) / summaryCards.length - 3);
            const cardHeight = 14;

            summaryCards.slice(0, 4).forEach((card, i) => {
                const cardX = 14 + i * (cardWidth + 4);
                
                // Fondo tarjeta
                doc.setFillColor(248, 250, 252); // slate-50
                doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'F');
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'D');

                // Label
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 116, 139); // slate-500
                doc.text(card.label.toUpperCase().slice(0, 26), cardX + 3, currentY + 4.5);

                // Valor
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59); // slate-800
                doc.text(String(card.value), cardX + 3, currentY + 10.5);
            });

            currentY += cardHeight + 4;
        }

        // 4. Tabla de Datos usando jspdf-autotable
        const tableHeaders = columns.map(c => c.header);
        const tableRows = rows.map(r => columns.map(c => {
            const val = r[c.key];
            return val !== undefined && val !== null ? String(val) : '—';
        }));

        autoTable(doc, {
            startY: currentY + 2,
            head: [tableHeaders],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 58, 138], // blue-900
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 2.5
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59],
                cellPadding: 2
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // slate-50
            },
            styles: {
                overflow: 'linebreak',
                valign: 'middle',
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            margin: { left: 14, right: 14, bottom: 15 },
            didDrawPage: (data) => {
                // Pie de página en cada hoja
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184); // slate-400
                doc.text(
                    `UrbanStep Venezuela C.A. • Reporte Oficial de Auditoría y Control Fiscal • Página ${doc.internal.getNumberOfPages()}`,
                    14,
                    pageHeight - 6
                );
                doc.text(
                    `Generado el ${new Date().toLocaleDateString('es-VE')}`,
                    pageWidth - 14,
                    pageHeight - 6,
                    { align: 'right' }
                );
            }
        });

        doc.save(`${filename || 'reporte_urbanstep'}.pdf`);
    }
};

export default reportExporter;
