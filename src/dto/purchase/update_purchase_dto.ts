import { Purchase, PurchaseItem } from "../../db";
import { PurchaseItemsRequest } from "./add_purchase_dto";

export class UpdatePurchaseRequest {
    constructor(
        public purchaseId: number,
        public invoiceNumber: number,
        public companyId: number,
        public partyId: number,
        public partyName: string,
        public subtotal: number,
        public discount: number = 0,
        public totalAfterDiscount: number,
        public tax: number,
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

        public oldItems: PurchaseItem[],
        public items: PurchaseItemsRequest[]
    ) {}
}

export class UpdatePurchaseResponse {
    constructor(
        public purchase: Purchase,
        public purchaseItems: PurchaseItem[],
        public message: string
    ) {}
}
