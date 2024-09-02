import { Purchase, PurchaseItem } from "../../db";

export interface PurchaseItemsRequest {
    itemId: number;
    itemName: string;
    companyId: number;
    unitId: number;
    unitName: string;
    unitsPurchased: number;
    pricePerUnit: number;
    subtotal: number;
    taxPercent: number;
    totalAfterTax: number;
}

export class AddPurchaseRequest {
    constructor(
        public invoiceNumber: number,
        public companyId: number,
        public partyId: number,
        public partyName: string,
        public subtotal: number,
        public discount: number = 0,
        public totalAfterDiscount: number,
        public taxPercent: number = 0,
        public taxName: string = "",
        public totalAfterTax: number,
        public isCredit: boolean,
        public paymentDueDate: string | null,
        public amountPaid: number = 0,
        public amountDue: number,
        public isFullyPaid: boolean,
        public paymentCompletionDate: string | null,
        public receiptNumber: string | null,

        public decimalRoundTo: number,

        public items: PurchaseItemsRequest[]
    ) {}
}


export class AddPurchaseResponse {
    constructor(
        public purchase: Purchase,
        public purchaseItems: PurchaseItem[],
        public message: string
    ){

    }
}