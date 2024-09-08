import { Sale } from "../../db";

export class GetAllSalesRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            partyId?: number;
            purchaseType?: "ALL" | "CASH" | "CREDIT";
            fromTransactionDate?: string;
            toTransactionDate?: string;
            getOnlyOverduePayments?: boolean;
            invoiceNumberSearchQuery?: number;
        },
        public cursor?: {
            updatedAt: Date;
            saleId: number;
        },
        public select?: [keyof Sale]
    ) {}
}

export class GetAllSalesResponse<T> {
    constructor(
        public sales: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            updatedAt: Date;
            saleId: number;
        }
    ) {}
}
