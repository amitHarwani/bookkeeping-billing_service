import { Purchase } from "../../db";

export class GetAllPurchasesRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            partyId?: number,
            purchaseType?: "ALL" | "CASH" | "CREDIT",
            fromTransactionDate?: string,
            toTransactionDate?: string,
            getOnlyOverduePayments?: boolean,
            invoiceNumberSearchQuery?: number
        },
        public cursor?: {
            updatedAt: Date,
            purchaseId: bigint
        },
        public select?: [keyof Purchase]
    ){

    }
}

export class GetAllPurchasesResponse<T>{
    constructor(
        public purchases: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            updatedAt: Date,
            purchaseId: bigint
        }
    ){

    }
}