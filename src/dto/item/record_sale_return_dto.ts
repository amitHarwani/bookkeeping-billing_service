import { ItemTypeForRecordingSale } from "../../constants";

export class RecordSaleReturnRequest {
    constructor(
        public saleId: number,
        public companyId: number,
        public items: Array<ItemTypeForRecordingSale>
    ) {}
}

export class RecordSaleReturnResponse {
    constructor(public message: string) {}
}
