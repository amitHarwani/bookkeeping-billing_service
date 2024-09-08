import { Sale, SaleItem } from "../../db";

export class GetSaleResponse {
    constructor(
        public sale: Sale,
        public saleItems: Array<SaleItem>
    ) {}
}
