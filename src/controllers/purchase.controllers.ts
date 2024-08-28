import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    AddPurchaseRequest,
    AddPurchaseResponse,
} from "../dto/purchase/add_purchase_dto";
import { db, PurchaseItem } from "../db";
import { purchaseItems, purchases } from "db_service";
import { ApiResponse } from "../utils/ApiResponse";

export const addPurchase = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddPurchaseRequest;

        await db.transaction(async (tx) => {
            /* Adding to purchase table */
            const purchaseAdded = await tx
                .insert(purchases)
                .values({
                    invoiceNumber: body.invoiceNumber,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    subtotal: body.subtotal.toString(),
                    discount: body.discount.toString(),
                    totalAfterDiscount: body.totalAfterDiscount.toString(),
                    taxPercent: body.taxPercent.toString(),
                    taxName: body.taxName,
                    totalAfterTax: body.totalAfterTax.toString(),
                    isCredit: body.isCredit,
                    paymentDueDate: body.paymentDueDate,
                    amountPaid: body.amountPaid.toString(),
                    amountDue: body.amountDue.toString(),
                    isFullyPaid: body.isFullyPaid,
                    paymentCompletionDate: body.paymentCompletionDate,
                    receiptNumber: body.receiptNumber,
                })
                .returning();

            /* Adding  items to purchaseItems table */
            let purchaseItemsAdded: PurchaseItem[] = [];
            for (const purchaseItem of body.items) {
                const purchaseItemAdded = await tx
                    .insert(purchaseItems)
                    .values({
                        purchaseId: purchaseAdded[0].purchaseId,
                        itemId: purchaseItem.itemId,
                        itemName: purchaseItem.itemName,
                        companyId: purchaseItem.companyId,
                        unitId: purchaseItem.unitId,
                        unitName: purchaseItem.unitName,
                        unitsPurchased: purchaseItem.unitsPurchased.toString(),
                        pricePerUnit: purchaseItem.pricePerUnit.toString(),
                        subtotal: purchaseItem.subtotal.toString(),
                        taxPercent: purchaseItem.taxPercent.toString(),
                        totalAfterTax: purchaseItem.totalAfterTax.toString(),
                    })
                    .returning();
                purchaseItemsAdded.push(purchaseItemAdded[0]);
            }

            return res.status(201).json(
                new ApiResponse<AddPurchaseResponse>(201, {
                    purchase: purchaseAdded[0],
                    purchaseItems: purchaseItemsAdded,
                    message: "purchase added successfully",
                })
            );
        });
    }
);
