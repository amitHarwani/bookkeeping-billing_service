export class GetTopSellersForCurrentMonthResponse {
    constructor(
        public topSellingItems: Array<{
            itemId: number;
            itemName: string;
            totalUnitsSold: string | null;
        }>
    ) {}
}
