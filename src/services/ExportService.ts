import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export interface ExportData {
  title: string;
  companyName: string;
  companyAddress: string;
  dateRange: { from?: string; to?: string };
  columns: string[];
  data: any[][];
  filename: string;
  numericColumns?: number[]; // indices of numeric columns for alignment and formatting
}

const formatNumberPDF = (num: any) => {
  const val = getRawNumber(num);
  if (val === 0) return '-';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatNumber = (num: any) => {
  const val = getRawNumber(num);
  if (val === 0) return '-';
  return '৳ ' + val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getRawNumber = (num: any): number => {
    if (typeof num === 'number') return num;
    if (!num) return 0;
    const parsed = parseFloat(String(num).replace(/[,৳ ]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
};

export const ExportService = {
  exportToPDF: (config: ExportData) => {
    // Auto-switch Portrait/Landscape based on columns
    const orientation = config.columns.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Set Font to Times New Roman
    doc.setFont("times", "bold");
    
    // Company Name
    doc.setFontSize(24);
    doc.text(config.companyName || 'Company Name', pageWidth / 2, 20, { align: 'center' });
    
    // Address
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    doc.text(config.companyAddress || 'Address not provided', pageWidth / 2, 28, { align: 'center' });
    
    // Report Title
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    const titleY = 40;
    doc.text(config.title.toUpperCase(), pageWidth / 2, titleY, { align: 'center' });
    const titleWidth = doc.getTextWidth(config.title.toUpperCase());
    doc.setLineWidth(0.5);
    doc.line((pageWidth - titleWidth) / 2, titleY + 2, (pageWidth + titleWidth) / 2, titleY + 2);
    
    // Date Range
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    const periodText = `Period: ${config.dateRange.from || 'Opening'} to ${config.dateRange.to || 'Present'}`;
    doc.text(periodText, pageWidth / 2, 50, { align: 'center' });

    // Table Data Formatting
    const formattedData = config.data.map(row => 
        row.map((cell, idx) => 
            config.numericColumns?.includes(idx) ? formatNumberPDF(cell) : cell
        )
    );

    // Column Styles
    const columnStyles: any = {};
    if (config.numericColumns) {
        config.numericColumns.forEach(idx => {
            columnStyles[idx] = { 
                halign: 'right',
                cellWidth: 'wrap', // Minimize width to fit content
                minCellWidth: 20   // But ensure at least enough for typical amounts
            };
        });
    }

    // Special case for Narration/Particulars - allow it to grow
    const textColIdx = config.columns.findIndex(c => 
        ['Narration', 'Particulars', 'Account', 'Description'].includes(c)
    );
    if (textColIdx !== -1) {
        columnStyles[textColIdx] = { cellWidth: 'auto' };
    }

    autoTable(doc, {
      startY: 60,
      head: [config.columns],
      body: formattedData,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 9, // Slightly smaller for better fit
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 41, 59], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate 50
      },
      columnStyles,
      didParseCell: (data) => {
        // Highlighting logic for section headers or totals (e.g., 'Assets', 'Total Income', etc)
        const rowData = data.row.raw as any[];
        if (rowData.length === 1) {
            data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [15, 23, 42]; // Slate 900
            // Spanning across all columns
            data.cell.colSpan = config.columns.length;
        } else if (rowData[0] && String(rowData[0]).toLowerCase().includes('total')) {
            data.cell.styles.fontStyle = 'bold';
        }
      },
      willDrawPage: (data) => {
        // Footer (Page numbers and generated time)
        doc.setFontSize(9);
        doc.setFont('times', 'normal');
        
        const pageCount = doc.getNumberOfPages();
        const currentPage = data.pageNumber;
        
        doc.text(
          `Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 
          15, 
          pageHeight - 15
        );
        doc.text(
          `Page ${currentPage}`, 
          pageWidth - 25, 
          pageHeight - 15
        );
      }
    });

    // Add Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    if (finalY + 20 < pageHeight) {
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.setLineWidth(0.5);

        // Prepared by
        doc.line(20, finalY, 70, finalY);
        doc.text("Prepared by", 45, finalY + 5, { align: 'center' });

        // Checked by
        doc.line(pageWidth / 2 - 25, finalY, pageWidth / 2 + 25, finalY);
        doc.text("Checked by", pageWidth / 2, finalY + 5, { align: 'center' });

        // Approved by
        doc.line(pageWidth - 70, finalY, pageWidth - 20, finalY);
        doc.text("Approved by", pageWidth - 45, finalY + 5, { align: 'center' });
    }

    doc.save(`${config.filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  },

  exportToExcel: async (config: ExportData) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(config.title.substring(0, 31));

    // Common styling
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    const thickBorderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' }
    };

    // Header Setup
    let currentRow = 1;

    // Company Name
    const companyRow = worksheet.getRow(currentRow);
    companyRow.height = 30;
    const companyCell = worksheet.getCell(`A${currentRow}`);
    companyCell.value = config.companyName;
    companyCell.font = { name: 'Times New Roman', size: 16, bold: true };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + config.columns.length)}${currentRow}`);
    currentRow++;

    // Address
    const addressRow = worksheet.getRow(currentRow);
    addressRow.height = 20;
    const addressCell = worksheet.getCell(`A${currentRow}`);
    addressCell.value = config.companyAddress;
    addressCell.font = { name: 'Times New Roman', size: 10 };
    addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + config.columns.length)}${currentRow}`);
    currentRow++;

    // Report Title
    const titleRow = worksheet.getRow(currentRow);
    titleRow.height = 25;
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = config.title.toUpperCase();
    titleCell.font = { name: 'Times New Roman', size: 14, bold: true, underline: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + config.columns.length)}${currentRow}`);
    currentRow++;

    // Date Range
    const dateRow = worksheet.getRow(currentRow);
    dateRow.height = 20;
    const dateCell = worksheet.getCell(`A${currentRow}`);
    dateCell.value = `Period: ${config.dateRange.from || 'Opening'} to ${config.dateRange.to || 'Present'}`;
    dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A${currentRow}:${String.fromCharCode(64 + config.columns.length)}${currentRow}`);
    currentRow++;

    // Empty Row
    currentRow++;

    // Table Headers
    const headerRow = worksheet.getRow(currentRow);
    config.columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col;
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' } // Slate 900
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
    });
    currentRow++;

    // Table Data
    let totalRowSums: { [key: number]: number } = {};
    if (config.numericColumns) {
        config.numericColumns.forEach(idx => totalRowSums[idx] = 0);
    }

    config.data.forEach((row, rowIdx) => {
        const dataRow = worksheet.getRow(currentRow);
        
        // If row has only 1 element, it's a section header (e.g. 'Assets', 'Income')
        if (row.length === 1) {
            const cell = dataRow.getCell(1);
            cell.value = row[0];
            cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E293B' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' } // Slate 100
            };
            worksheet.mergeCells(currentRow, 1, currentRow, config.columns.length);
        } else {
            config.columns.forEach((_, colIdx) => {
                const cellData = row[colIdx];
                const cell = dataRow.getCell(colIdx + 1);
                
                if (cellData !== undefined && cellData !== null && config.numericColumns?.includes(colIdx)) {
                    const numericValue = getRawNumber(cellData);
                    if (numericValue === 0) {
                        cell.value = null; // Blank for zero
                    } else {
                        cell.value = numericValue;
                        cell.numFmt = '#,##0.00;(#,##0.00);"-"';
                        totalRowSums[colIdx] += numericValue;
                    }
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                } else {
                    cell.value = cellData || '';
                    if (row[0] && String(row[0]).toLowerCase().includes('total')) {
                        cell.font = { name: 'Times New Roman', size: 11, bold: true };
                    }
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                }
                
                cell.font = cell.font || { name: 'Times New Roman', size: 11 };
                cell.border = borderStyle;
            });
        }
        
        // Alternating row background (only for data rows)
        if (row.length > 1 && rowIdx % 2 !== 0) {
            dataRow.eachCell(cell => {
                if (!cell.fill) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' } // Slate 50
                    };
                }
            });
        }
        
        currentRow++;
    });

    // Sub-totals (if numeric columns exist and it makes sense for the report)
    // We disable generic sub-totals for Profit & Loss or Balance Sheet as they already have their own sub-totals
    const skipGenericSubTotals = config.title.toLowerCase().includes('profit') || config.title.toLowerCase().includes('balance sheet');
    
    if (!skipGenericSubTotals && config.numericColumns && config.numericColumns.length > 0) {
        const subTotalRow = worksheet.getRow(currentRow);
        
        config.columns.forEach((_, colIdx) => {
             const cell = subTotalRow.getCell(colIdx + 1);
             cell.font = { name: 'Times New Roman', size: 11, bold: true };
             cell.border = thickBorderStyle;
             
             if (colIdx === 0) {
                 cell.value = 'Total';
                 cell.alignment = { horizontal: 'center', vertical: 'middle' };
             } else if (config.numericColumns?.includes(colIdx)) {
                 const totalValue = totalRowSums[colIdx];
                 if (totalValue === 0) {
                     cell.value = null;
                 } else {
                     cell.value = totalValue;
                     cell.numFmt = '#,##0.00;(#,##0.00);"-"';
                 }
                 cell.alignment = { horizontal: 'right', vertical: 'middle' };
                 // For running balances, a simple sum might be misleading, 
                 // but typically total debit/credit makes sense.
                 // We will skip summing if the column name implies "balance" (unless it's Trial Balance balances? Usually Trial Balance sums Debits and Credits and they should match)
                 if (config.columns[colIdx].toLowerCase().includes('balance')) {
                     // For balance, just show the last row's balance
                     if (config.data.length > 0) {
                         cell.value = getRawNumber(config.data[config.data.length - 1][colIdx]);
                     } else {
                         cell.value = undefined;
                     }
                 }
             }
        });
        currentRow += 2;
    }

    // Adjust column widths
    worksheet.columns.forEach((column, idx) => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            // if cell is part of merged header, ignore it for width calc
            if (cell.isMerged && parseInt(cell.row, 10) < 5) return;
            // if it's a number, formatted string might be a bit longer
            if (typeof cell.value === 'number') columnLength += 5;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50); // Min 10, Max 50
    });

    // Generate output
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
