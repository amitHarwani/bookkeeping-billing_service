import { SaleReturn } from "../../db";

export class GetSaleReturnsOfSaleResponse {
    constructor(
        public saleReturns: Array<SaleReturn>
    ){

    }
}