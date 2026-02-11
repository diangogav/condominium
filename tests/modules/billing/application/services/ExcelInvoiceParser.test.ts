import { describe, expect, it } from 'bun:test';
import { ExcelJSInvoiceParser } from '@/modules/billing/infrastructure/services/ExcelJSInvoiceParser';
import ExcelJS from 'exceljs';

describe('ExcelJSInvoiceParser', () => {
    it('should parse valid excel data matching the board format', async () => {
        const parser = new ExcelJSInvoiceParser();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sheet1');

        // Headers (Row 4)
        sheet.getRow(4).values = ['N° Apto', 'Cuota', 'Items', 'Año', 'Fecha', 'N° de Recibo', 'Saldo $'];

        // Data for Unit 11
        sheet.addRow(['11', 'ROGELIO LEAL', '1', 2026, '01/27/2026', '7170', 24.15]);
        sheet.addRow(['', 'TOTAL 11', '', '', '', '', 24.15]); // Intermediary total

        // Data for Unit 13 (Multiple invoices)
        sheet.addRow(['13', 'JOAO', '4', 2025, '10/31/2025', '7058', 19.19]);
        sheet.addRow(['', '', '', '', '11/30/2025', '7096', 24.17]);
        sheet.addRow(['', '', '', 2026, '01/27/2026', '7172', 19.03]);

        const buffer = await workbook.xlsx.writeBuffer();
        const result = await parser.parse(buffer as any);
        const results = result.invoices;

        expect(results).toHaveLength(4);
        expect(results[0]).toMatchObject({
            unitName: '11',
            amount: 24.15,
            period: '2026-01',
            receiptNumber: '7170'
        });
        expect(results[1]).toMatchObject({
            unitName: '13',
            amount: 19.19,
            period: '2025-10',
            receiptNumber: '7058'
        });
        expect(results[2]).toMatchObject({
            unitName: '13',
            amount: 24.17,
            period: '2025-11',
            receiptNumber: '7096'
        });
        expect(results[3]).toMatchObject({
            unitName: '13',
            amount: 19.03,
            period: '2026-01',
            receiptNumber: '7172'
        });
    });
});
