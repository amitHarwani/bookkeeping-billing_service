import { ItemTypeForRecordingSale } from "../../constants";

export class RecordSaleUpdateRequest {
    constructor(
        public saleId: number,
        public companyId: number,
        public items: {
            itemsRemoved?: Array<ItemTypeForRecordingSale>;
            itemsUpdated?: Array<{
                old: ItemTypeForRecordingSale;
                new: ItemTypeForRecordingSale;
            }>;
        }
    ) {}
}

export class RecordPurchaseUpdateResponse {
    constructor(public message: string) {}
}
