import { Sale, SaleItem } from "../../db";
import { SaleItemsRequest } from "./add_sale_dto";

export class UpdateSaleRequest {
    constructor(
        public saleId: number,
        public invoiceNumber: number | null,
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
        public totalAfterTax: number,
        public isCredit: boolean,
        public paymentDueDate: string | null,
        public amountPaid: number = 0,
        public amountDue: number,
        public isFullyPaid: boolean,
        public paymentCompletionDate: string | null,

        public oldAmountPaid: number = 0,
        public decimalRoundTo: number,

        public items: SaleItemsRequest[],
        public oldItems: SaleItem[]
    ) {}
}

export class UpdateSaleResponse {
    constructor(
        public sale: Sale,
        public saleItems: SaleItem[],
        public message: string
    ) {}
}
