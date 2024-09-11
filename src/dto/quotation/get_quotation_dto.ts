import { Quotation, QuotationItem } from "../../db";

export class GetQuotationResponse {
    constructor(
        public quotation: Quotation,
        public quotationItems: QuotationItem[]
    ) {}
}
