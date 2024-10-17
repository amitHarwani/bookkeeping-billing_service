import { SaleReturn, SaleReturnItem } from "../../db";

export class GetSaleReturnResponse {
    constructor(
        public saleReturn: SaleReturn,
        public saleReturnItems: Array<SaleReturnItem>
    ) {}
}
