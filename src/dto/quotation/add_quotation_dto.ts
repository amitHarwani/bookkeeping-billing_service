import { Quotation, QuotationItem } from "../../db";

export interface QuotationItemsRequest {
    itemId: number;
    itemName: string;
    companyId: number;
    unitId: number;
    unitName: string;
    unitsSold: number;
    pricePerUnit: number;
    subtotal: number;
    tax: number,
    taxPercent: number;
    totalAfterTax: number;
}

export class AddQuotationRequest {
    constructor(
        public createdAt: string,
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

        public decimalRoundTo: number,

        public items: QuotationItemsRequest[]

    ){

    }
}

export class AddQuotationResponse {
    constructor(
        public quotation: Quotation,
        public quotationItems: QuotationItem[],
        public message: string
    ){

    }
}