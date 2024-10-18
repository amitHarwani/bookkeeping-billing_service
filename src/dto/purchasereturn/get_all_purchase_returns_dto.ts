import { PurchaseReturn } from "../../db";

export class GetAllPurchaseReturnsRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            fromDate?: string;
            toDate?: string;
            purchaseReturnNumber?: number;
        },
        public cursor?: {
            createdAt: Date;
            purchaseReturnId: number;
        },
        public select?: [keyof PurchaseReturn]
    ) {}
}

export class GetAllPurchaseReturnsResponse<T> {
    constructor(
        public purchaseReturns: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            createdAt: Date;
            purchaseReturnId: number;
        }
    ) {}
}
