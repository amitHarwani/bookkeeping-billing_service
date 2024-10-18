import { SaleReturn, SaleReturnItem } from "../../db";


export interface SaleReturnItemsRequest {
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

export class AddSaleReturnRequest {
    constructor(
        public createdAt: string,
        public saleId: number,
        public invoiceNumber: number,
        public saleReturnNumber: number | null,
        public companyId: number,
        public subtotal: number,
        public tax: number,
        public taxPercent: number = 0,
        public taxName: string = "",
        public totalAfterTax: number,

        public decimalRoundTo: number,

        public items: SaleReturnItemsRequest[]
    ) {}
}

export class AddSaleReturnResponse {
    constructor(
        public saleReturn: SaleReturn,
        public saleReturnItems: Array<SaleReturnItem>
    ){

    }
}
