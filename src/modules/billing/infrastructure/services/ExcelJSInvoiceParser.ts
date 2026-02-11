import ExcelJS, { Row } from 'exceljs';
import { DomainError } from '@/core/errors';
import { IExcelInvoiceParser, RawInvoiceData, ParseResult } from '../../domain/services/IExcelInvoiceParser';

export class ExcelJSInvoiceParser implements IExcelInvoiceParser {
    private readonly DATA_START_ROW = 5;

    async parse(buffer: Buffer): Promise<ParseResult> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            throw new DomainError('Worksheet not found in Excel file', 'VALIDATION_ERROR', 400);
        }

        const invoices: RawInvoiceData[] = [];
        let currentUnit: string | null = null;
        let currentYear: number | null = null;
        let currentUnitSum = 0;
        let unitInvoicesIndices: number[] = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < this.DATA_START_ROW) return;

            const unitInfo = this.extractUnitInfo(row);
            if (unitInfo) {
                currentUnit = unitInfo;
                currentUnitSum = 0;
                unitInvoicesIndices = [];
            }

            const yearInfo = this.extractYearInfo(row);
            if (yearInfo) {
                currentYear = yearInfo;
            }

            const invoiceData = this.extractInvoiceData(row, currentUnit, currentYear);
            if (invoiceData) {
                invoices.push(invoiceData);
                currentUnitSum += invoiceData.amount;
                unitInvoicesIndices.push(invoices.length - 1);
            }

            // Check for total mismatch
            const unitTotalValue = this.extractUnitTotal(row);
            if (unitTotalValue && unitInvoicesIndices.length > 0) {
                const diff = Math.abs(currentUnitSum - unitTotalValue);
                if (diff > 0.01) {
                    const lastInvoice = invoices[unitInvoicesIndices[unitInvoicesIndices.length - 1]];
                    lastInvoice.warning = `Discrepancia detectada: La suma del Excel para ${currentUnit} indica $${unitTotalValue.toFixed(2)}, pero las facturas individuales suman $${currentUnitSum.toFixed(2)}.`;
                }
            }
        });

        return {
            invoices,
            summary: {
                totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
                invoiceCount: invoices.length
            }
        };
    }

    private extractUnitTotal(row: Row): number | null {
        // According to our hunt, Col 8 (H) has unit totals if Col 2 has "TOTAL"
        const label = row.getCell(2).value?.toString().toLowerCase() || '';
        const unitLabel = row.getCell(1).value?.toString().toLowerCase() || '';

        if (label.includes('total') || unitLabel.includes('total')) {
            const totalCell = row.getCell(8).value;
            return this.parseAmount(totalCell);
        }
        return null;
    }

    private extractUnitInfo(row: Row): string | null {
        const unitCell = row.getCell(1).value?.toString().trim();
        if (unitCell && unitCell !== '' && !unitCell.toLowerCase().includes('total')) {
            return unitCell;
        }
        return null;
    }

    private extractYearInfo(row: Row): number | null {
        const yearCell = row.getCell(4).value;
        if (yearCell && typeof yearCell === 'number') {
            return yearCell;
        }
        return null;
    }

    private extractInvoiceData(row: Row, currentUnit: string | null, currentYear: number | null): RawInvoiceData | null {
        const dateCell = row.getCell(5).value;
        const receiptCell = row.getCell(6).value;
        const amountCell = row.getCell(7).value;

        if (!dateCell || !amountCell || !receiptCell || !currentUnit) {
            return null;
        }

        const amount = this.parseAmount(amountCell);
        if (amount <= 0) return null;

        const issueDate = this.parseExcelDate(dateCell);

        // Derive period YYYY-MM
        const year = currentYear || issueDate.getFullYear();
        const month = (issueDate.getMonth() + 1).toString().padStart(2, '0');
        const period = `${year}-${month}`;

        return {
            unitName: currentUnit,
            amount,
            period,
            issueDate,
            receiptNumber: receiptCell.toString()
        };
    }

    private parseAmount(value: unknown): number {
        if (value === null || value === undefined) return 0;

        let num: number;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'object' && 'result' in (value as any)) {
            const result = (value as { result: unknown }).result;
            num = typeof result === 'number' ? result : parseFloat(String(result));
        } else if (typeof value === 'string') {
            // Remove common currency symbols and handle commas as decimal separators if common in locale
            // For now, assume standard numeric string or remove formatting
            const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
            num = parseFloat(cleaned);
        } else {
            num = parseFloat(String(value));
        }

        return isNaN(num) ? 0 : num;
    }

    private parseExcelDate(value: unknown): Date {
        if (value instanceof Date) return value;
        if (typeof value === 'number') {
            return new Date((value - 25569) * 86400 * 1000);
        }
        if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
        }
        throw new DomainError(`Invalid date format in Excel: ${value}`, 'VALIDATION_ERROR', 400);
    }
}
