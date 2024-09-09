import { ItemTypeForRecordingPurchase } from "../../constants";

export class RecordPurchaseUpdateRequest {
    constructor(
        public purchaseId: number,
        public companyId: number,
        public items: {
            itemsRemoved?: Array<ItemTypeForRecordingPurchase>;
            itemsUpdated?: Array<{
                old: ItemTypeForRecordingPurchase;
                new: ItemTypeForRecordingPurchase;
            }>;
        }
    ) {}
}

export class RecordPurchaseUpdateResponse {
    constructor(public message: string) {}
}
