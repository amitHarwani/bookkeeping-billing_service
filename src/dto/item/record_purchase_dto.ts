export class RecordPurchaseRequest {
    constructor(
        public purchaseId: number | null,
        public itemsPurchased: Array<{
            itemId: number;
            companyId: number;
            unitsPurchased: number;
            pricePerUnit: number;
        }>
    ) {}
}

export class RecordPurchaseResponse {
    constructor(public message: string) {}
}
