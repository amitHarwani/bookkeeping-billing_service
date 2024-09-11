import { Quotation } from "../../db";

export class GetAllQuotationsRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            partyId?: number;
            fromDate?: string;
            toDate?: string;
            quotationNumberSearchQuery?: number;
        },
        public cursor?: {
            updatedAt: Date;
            quotationId: number;
        },
        public select?: [keyof Quotation]
    ) {}
}

export class GetAllQuotationsResponse<T> {
    constructor(
        public quotations: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            updatedAt: Date;
            quotationId: number;
        }
    ) {}
}
