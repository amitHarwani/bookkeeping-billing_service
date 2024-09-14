export class GetCashFlowSummaryRequest {
    constructor(
        public companyId: number,
        public from: string,
        public to: string
    ) {}
}

export class GetCashFlowSummaryResponse {
    constructor(
        public cashIn: number,
        public cashOut: number,
        public collectionsDue: number,
        public paymentsDue: number
    ) {}
}
