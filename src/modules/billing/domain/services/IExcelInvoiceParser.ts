export interface RawInvoiceData {
    unitName: string;
    amount: number;
    period: string;
    issueDate: Date;
    receiptNumber: string;
    warning?: string; // <-- New field for row-level warnings (e.g., unit total mismatch)
}

export interface ParseResult {
    invoices: RawInvoiceData[];
    summary: {
        totalAmount: number;
        invoiceCount: number;
    };
}

export interface IExcelInvoiceParser {
    parse(buffer: Buffer): Promise<ParseResult>;
}
