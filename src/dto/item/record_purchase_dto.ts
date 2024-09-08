export class RecordPurchaseRequest {
    constructor(
        public purchaseId: number,
        public companyId: number,
        public items: Array<{
            itemId: number;
            unitsPurchased: number;
            pricePerUnit: number;
        }>
    ) {}
}

export class RecordPurchaseResponse {
    constructor(public message: string) {}
}
