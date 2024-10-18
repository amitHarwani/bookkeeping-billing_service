import { PurchaseReturn, PurchaseReturnItem } from "../../db";

export class GetPurchaseReturnResponse {
    constructor(
        public purchaseReturn: PurchaseReturn,
        public purchaseReturnItems: Array<PurchaseReturnItem>
    ) {}
}
