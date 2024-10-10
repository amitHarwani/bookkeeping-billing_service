import { Quotation, QuotationItem } from "../../db";
import { QuotationItemsRequest } from "./add_quotation_dto";

export class UpdateQuotationRequest {
    constructor(
        public quotationId: number,
        public quotationNumber: number | null,
        public companyId: number,
        public partyId: number,
        public partyName: string,
        public createdBy: string,
        public subtotal: number,
        public discount: number = 0,
        public totalAfterDiscount: number,
        public tax: number,
        public taxPercent: number = 0,
        public taxName: string = "",
        public totalAfterTax: number,
        public companyTaxNumber: string = "",
        public partyTaxNumber: string = "",

        public decimalRoundTo: number,
        public oldItems: QuotationItem[],

        public items: QuotationItemsRequest[]
    ) {}
}

export class UpdateQuotationResponse {
    constructor(
        public quotation: Quotation,
        public quotationItems: QuotationItem[],
        public message: string
    ) {}
}
