import { Sale, SaleItem } from "../../db";


export interface SaleItemsRequest {
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

export class AddSaleRequest {
    constructor(
        public createdAt: string,
        public invoiceNumber: number | null,
        public quotationNumber: number | null,
        public companyId: number,
        public partyId: number | null,
        public partyName: string | null,
        public isNoPartyBill: boolean,
        public doneBy: string,
        public subtotal: number,
        public discount: number = 0,
        public totalAfterDiscount: number,
        public tax: number,
        public taxPercent: number = 0,
        public taxName: string = "",
        public companyTaxNumber: string = "",
        public partyTaxNumber: string = "",
        public totalAfterTax: number,
        public isCredit: boolean,
        public paymentDueDate: string | null,
        public amountPaid: number = 0,
        public amountDue: number,
        public isFullyPaid: boolean,
        public paymentCompletionDate: string | null,

        public decimalRoundTo: number,

        public items: SaleItemsRequest[]
    ) {}
}

export class AddSaleResponse {
    constructor(
        public sale: Sale,
        public saleItems: Array<SaleItem>
    ){

    }
}
