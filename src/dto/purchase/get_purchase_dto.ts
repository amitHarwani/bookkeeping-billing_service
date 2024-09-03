import { Purchase, PurchaseItem } from "../../db";

export class GetPurchaseResponse {
    constructor(
        public purchase: Purchase,
        public purchaseItems: PurchaseItem[]
    ){}
}