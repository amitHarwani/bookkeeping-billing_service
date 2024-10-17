import { SaleReturn } from "../../db";

export class GetAllSaleReturnsRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            fromDate?: string;
            toDate?: string;
            saleReturnNumber?: number;
        },
        public cursor?: {
            createdAt: Date;
            saleReturnId: number;
        },
        public select?: [keyof SaleReturn]
    ) {}
}

export class GetAllSaleReturnsResponse<T> {
    constructor(
        public saleReturns: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            createdAt: Date;
            saleReturnId: number;
        }
    ) {}
}
