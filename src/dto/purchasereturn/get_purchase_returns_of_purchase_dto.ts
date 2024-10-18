import { PurchaseReturn } from "../../db";

export class GetPurchaseReturnsOfPurchaseResponse {
    constructor(public purchaseReturns: Array<PurchaseReturn>) {}
}
