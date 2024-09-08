import { ItemTypeForRecordingSale } from "../../constants";

export class RecordSaleRequest {
    constructor(
        public companyId: number,
        public saleId: number,
        public items: Array<ItemTypeForRecordingSale>
    ) {}
}


export class RecordSaleResponse {
    constructor(
        public message: string
    ){

    }
}
