export class RecordPurchaseRequest {
    constructor(
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
