import { credentials } from "@grpc/grpc-js";
import {
    InventoryServiceClient,
    RecordPurchaseRequest,
    RecordPurchaseUpdateRequest,
    RecordSaleRequest,
    RecordSaleUpdateRequest,
} from "./proto/inventory_service";

const client = new InventoryServiceClient(
    process.env.INVENTORY_GRPC_SERVICE as string,
    credentials.createInsecure()
);

export const recordSaleGRPC = (body: RecordSaleRequest) => {
    return new Promise((resolve, reject) => {
        /* GRPC request to server */
        client.recordSale(body, (error, response) => {
            if (error) {
                /* On error reject */
                return reject(error);
            } else {
                return resolve(true);
            }
        });
    });
};

export const recordPurchaseGRPC = (body: RecordPurchaseRequest) => {
    return new Promise((resolve, reject) => {
        /* GRPC request to server */
        client.recordPurchase(body, (error, response) => {
            if (error) {
                /* On error reject */
                return reject(error);
            } else {
                return resolve(true);
            }
        });
    });
};

export const recordSaleUpdateGRPC = (body: RecordSaleUpdateRequest) => {
    return new Promise((resolve, reject) => {
        /* GRPC request to server */
        client.recordSaleUpdate(body, (error, response) => {
            if (error) {
                /* On error reject */
                return reject(error);
            } else {
                return resolve(true);
            }
        });
    });
};

export const recordPurchaseUpdateGRPC = (body: RecordPurchaseUpdateRequest) => {
    return new Promise((resolve, reject) => {
        /* GRPC request to server */
        client.recordPurchaseUpdate(body, (error, response) => {
            if (error) {
                /* On error reject */
                return reject(error);
            } else {
                return resolve(true);
            }
        });
    });
};
