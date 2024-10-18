import { PurchaseReturn, PurchaseReturnItem } from "../../db";


export interface PurchaseReturnItemsRequest {
    itemId: number;
    itemName: string;
    companyId: number;
    unitId: number;
    unitName: string;
    unitsPurchased: number;
    pricePerUnit: number;
    subtotal: number;
    tax: number,
    taxPercent: number;
    totalAfterTax: number;
}

export class AddPurchaseReturnRequest {
    constructor(
        public createdAt: string,
        public purchaseId: number,
        public purchaseReturnNumber: number | null,
        public companyId: number,
        public subtotal: number,
        public tax: number,
        public taxPercent: number = 0,
        public taxName: string = "",
        public totalAfterTax: number,

        public decimalRoundTo: number,

        public items: PurchaseReturnItemsRequest[]
    ) {}
}

export class AddPurchaseReturnResponse {
    constructor(
        public purchaseReturn: PurchaseReturn,
        public purchaseReturnItems: Array<PurchaseReturnItem>
    ){

    }
}
