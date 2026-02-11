import ExcelJS from 'exceljs';
import { DomainError } from '@/core/errors';

export interface RawInvoiceData {
    unitName: string;
    amount: number;
    period: string;
    issueDate: Date;
    receiptNumber: string;
}

export class ExcelInvoiceParser {
    async parse(buffer: Buffer): Promise<RawInvoiceData[]> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const worksheet = workbook.getWorksheet(1); // Assuming first sheet

        if (!worksheet) {
            throw new DomainError('Worksheet not found in Excel file', 'VALIDATION_ERROR', 400);
        }

        const invoices: RawInvoiceData[] = [];
        let currentUnit: string | null = null;
        let currentYear: number | null = null;

        // Start from row 5 based on screenshot (headers at row 4)
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < 5) return;

            const unitCell = row.getCell(1).value?.toString().trim();
            const yearCell = row.getCell(4).value;
            const dateCell = row.getCell(5).value;
            const receiptCell = row.getCell(6).value;
            const amountCell = row.getCell(7).value;

            // 1. Update currentUnit if Apto column has value
            if (unitCell && unitCell !== '' && !unitCell.toLowerCase().includes('total')) {
                currentUnit = unitCell;
            }

            // 2. Update currentYear if year column has value
            if (yearCell && typeof yearCell === 'number') {
                currentYear = yearCell;
            }

            // 3. If we have a date, amount and receipt, it's an invoice row
            if (dateCell && amountCell && receiptCell) {
                if (!currentUnit) return; // Should not happen with well-formed excel

                let amount = 0;
                if (typeof amountCell === 'number') {
                    amount = amountCell;
                } else if (typeof amountCell === 'object' && 'result' in amountCell) {
                    amount = Number(amountCell.result);
                }

                if (amount <= 0) return;

                const issueDate = this.parseExcelDate(dateCell);

                // Derive period YYYY-MM
                const year = currentYear || issueDate.getFullYear();
                const month = (issueDate.getMonth() + 1).toString().padStart(2, '0');
                const period = `${year}-${month}`;

                invoices.push({
                    unitName: currentUnit,
                    amount,
                    period,
                    issueDate,
                    receiptNumber: receiptCell.toString()
                });
            }
        });

        return invoices;
    }

    private parseExcelDate(value: any): Date {
        if (value instanceof Date) return value;
        if (typeof value === 'number') {
            // Excel numeric date format
            return new Date((value - 25569) * 86400 * 1000);
        }
        if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
        }
        throw new DomainError(`Invalid date format in Excel: ${value}`, 'VALIDATION_ERROR', 400);
    }
}
