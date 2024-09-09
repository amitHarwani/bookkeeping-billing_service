import axios from "axios";
import {
    RecordSaleRequest,
    RecordSaleResponse,
} from "../dto/item/record_sale_dto";
import { SaleItemsRequest } from "../dto/sale/add_sale_dto";
import { ApiResponse } from "./ApiResponse";
import { RecordPurchaseRequest } from "../dto/item/record_purchase_dto";
import { RecordPurchaseUpdateRequest } from "../dto/item/record_purchase_update_dto";

export class UpdateInventoryHelper {
    constructor() {}

    recordSales = async (recordSaleReqBody: RecordSaleRequest) => {
        try {
            /* API Call to Inventory Service */
            await axios.patch<ApiResponse<RecordSaleResponse>>(
                `${process.env.INVENTORY_SERVICE}/${process.env.RECORD_SALE_PATH}`,
                recordSaleReqBody
            );
        } catch (error) {
            throw error;
        }
    };

    recordPurchase = async (recordPurchaseBody: RecordPurchaseRequest) => {
        try {
            await axios.patch(
                `${process.env.INVENTORY_SERVICE}/${process.env.RECORD_PURCHASE_PATH}`,
                recordPurchaseBody
            );
        } catch (error) {
            throw error;
        }
    };

    recordPurchaseUpdate = async (
        recordPurchaseUpdateBody: RecordPurchaseUpdateRequest
    ) => {
        try {
            await axios.patch(
                `${process.env.INVENTORY_SERVICE}/${process.env.RECORD_PURCHASE_UPDATE_PATH}`,
                recordPurchaseUpdateBody
            );
        } catch (error) {
            throw error;
        }
    };
}
