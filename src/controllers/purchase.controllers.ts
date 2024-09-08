import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    AddPurchaseRequest,
    AddPurchaseResponse,
    PurchaseItemsRequest,
} from "../dto/purchase/add_purchase_dto";
import { db, PurchaseItem } from "../db";
import { items, purchaseItems, purchases, saleItems } from "db_service";
import { ApiResponse } from "../utils/ApiResponse";
import {
    GetAllPurchasesRequest,
    GetAllPurchasesResponse,
} from "../dto/purchase/get_all_purchases_dto";
import {
    and,
    asc,
    between,
    desc,
    eq,
    getTableColumns,
    gt,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiError } from "../utils/ApiError";
import axios from "axios";
import { RecordPurchaseRequest } from "../dto/item/record_purchase_dto";
import { GetPurchaseResponse } from "../dto/purchase/get_purchase_dto";
import {
    UpdatePurchaseRequest,
    UpdatePurchaseResponse,
} from "../dto/purchase/update_purchase_dto";
import { UpdateInventoryHelper } from "../utils/UpdateInventoryHelper";

export const getAllPurchases = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllPurchasesRequest;

        /* Custom Query */
        let customQuery;

        /* if query is passed */
        if (body.query) {
            let partyIdQuery;
            let purchaseTypeQuery;
            let transactionDateQuery;
            let overduePaymentsQuery;
            let invoiceNumberQuery;

            /* Querying by partyId */
            if (typeof body?.query?.partyId === "number") {
                partyIdQuery = eq(purchases.partyId, body.query.partyId);
            }
            /* Querying by purchase type : Cash or Credit */
            if (
                typeof body?.query?.purchaseType === "string" &&
                body.query.purchaseType !== "ALL"
            ) {
                let isCreditTransactions = body.query.purchaseType === "CREDIT";
                purchaseTypeQuery = eq(
                    purchases.isCredit,
                    isCreditTransactions
                );
            }
            /* Transaction Dates Query */
            if (
                body?.query?.fromTransactionDate &&
                body?.query?.toTransactionDate
            ) {
                transactionDateQuery = between(
                    purchases.createdAt,
                    moment
                        .utc(
                            body.query.fromTransactionDate,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    moment
                        .utc(
                            body.query.toTransactionDate,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate()
                );
            }
            /* Querying for overdue payments */
            if (body?.query?.getOnlyOverduePayments) {
                overduePaymentsQuery = sql`${purchases.paymentDueDate} > ${moment.utc().format(DATE_TIME_FORMATS.dateFormat)}`;
            }
            if (
                body?.query?.invoiceNumberSearchQuery &&
                !isNaN(body?.query?.invoiceNumberSearchQuery)
            ) {
                invoiceNumberQuery = eq(
                    purchases.invoiceNumber,
                    body.query.invoiceNumberSearchQuery
                );
            }

            /* Combining the query */
            customQuery = and(
                partyIdQuery,
                purchaseTypeQuery,
                transactionDateQuery,
                overduePaymentsQuery,
                invoiceNumberQuery
            );
        }

        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            /* purchaseId should be greater than the last purchaseId fetched, and updatedAt must be equal to the lastUpdatedAt fetched
            or updatedAt should be less than the last updatedAt fetched, since purchases are ordered by updated at.
            and filtering by companyId, and the custom query */
            whereClause = and(
                or(
                    sql`${purchases.updatedAt} < ${body.cursor.updatedAt}`,
                    and(
                        sql`${purchases.updatedAt} = ${body.cursor.updatedAt}`,
                        gt(purchases.purchaseId, body.cursor.purchaseId)
                    )
                ),
                eq(purchases.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* All purchase columns */
        const purchaseColumns = getTableColumns(purchases);

        /* Default cols to select always */
        let colsToSelect = {
            purchaseId: purchases.purchaseId,
            updatedAt: purchases.updatedAt,
        };

        /* If select is passed */
        if (body?.select) {
            /* Keys of all purchase columns */
            const purchaseColumnKeys = Object.keys(purchaseColumns);

            /* Add column to colsToSelect */
            body.select?.forEach((col) => {
                /* If column name is invalid throw error */
                if (!purchaseColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid col to select ${col}`, []);
                }

                colsToSelect = { ...colsToSelect, [col]: purchaseColumns[col] };
            });
        } else {
            /* Else, select all columns */
            colsToSelect = purchaseColumns;
        }

        /* DB Query */
        const allPurchases = await db
            .select(colsToSelect)
            .from(purchases)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(desc(purchases.updatedAt), asc(purchases.purchaseId));

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allPurchases?.[allPurchases.length - 1];
        if (lastItem) {
            nextPageCursor = {
                purchaseId: lastItem.purchaseId,
                updatedAt: lastItem.updatedAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllPurchasesResponse<typeof allPurchases>>(200, {
                purchases: allPurchases,
                hasNextPage: nextPageCursor ? true : false,
                nextPageCursor: nextPageCursor,
            })
        );
    }
);

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
                    subtotal: body.subtotal.toFixed(body.decimalRoundTo),
                    discount: body.discount.toString(),
                    totalAfterDiscount: body.totalAfterDiscount.toFixed(
                        body.decimalRoundTo
                    ),
                    tax: body.tax.toFixed(body.decimalRoundTo),
                    taxPercent: body.taxPercent.toString(),
                    taxName: body.taxName,
                    totalAfterTax: body.totalAfterTax.toFixed(
                        body.decimalRoundTo
                    ),
                    isCredit: body.isCredit,
                    paymentDueDate: body.paymentDueDate,
                    amountPaid: body.amountPaid.toString(),
                    amountDue: body.amountDue.toString(),
                    isFullyPaid: body.isFullyPaid,
                    paymentCompletionDate: body.paymentCompletionDate,
                    receiptNumber: body.receiptNumber,
                })
                .returning();

            let updateInventoryBody: RecordPurchaseRequest = {
                purchaseId: purchaseAdded[0].purchaseId,
                companyId: body.companyId,
                items: [],
            };

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
                        subtotal: purchaseItem.subtotal.toFixed(
                            body.decimalRoundTo
                        ),
                        tax: purchaseItem.tax.toFixed(body.decimalRoundTo),
                        taxPercent: purchaseItem.taxPercent.toString(),
                        totalAfterTax: purchaseItem.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .returning();

                purchaseItemsAdded.push(purchaseItemAdded[0]);

                /* Adding to updateInventoryBody request */
                updateInventoryBody.items.push({
                    itemId: purchaseItem.itemId,
                    pricePerUnit: purchaseItem.pricePerUnit,
                    unitsPurchased: purchaseItem.unitsPurchased,
                });
            }

            /* Updating Inventory */
            await new UpdateInventoryHelper().recordPurchase(
                updateInventoryBody
            );

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

export const getPurchase = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Purchase id and company id from query */
        const purchaseId = Number(req.query?.purchaseId);
        const companyId = Number(req.query?.companyId);

        /* Purchase details */
        const purchaseDetailsRequest = db
            .select()
            .from(purchases)
            .where(
                and(
                    eq(purchases.purchaseId, purchaseId),
                    eq(purchases.companyId, companyId)
                )
            );

        /* Purchase Items */
        const purchaseItemsRequest = db
            .select()
            .from(purchaseItems)
            .where(
                and(
                    eq(purchaseItems.purchaseId, purchaseId),
                    eq(purchaseItems.companyId, companyId)
                )
            );

        /* Parallel calls */
        const [purchaseDetails, purchaseItemsFromDB] = await Promise.all([
            purchaseDetailsRequest,
            purchaseItemsRequest,
        ]);

        return res.status(200).json(
            new ApiResponse<GetPurchaseResponse>(200, {
                purchase: purchaseDetails[0],
                purchaseItems: purchaseItemsFromDB,
            })
        );
    }
);

export const updatePurchase = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdatePurchaseRequest;

        await db.transaction(async (tx) => {
            /* Updating in purchase table */
            const purchaseUpdated = await tx
                .update(purchases)
                .set({
                    invoiceNumber: body.invoiceNumber,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    subtotal: body.subtotal.toFixed(body.decimalRoundTo),
                    discount: body.discount.toString(),
                    totalAfterDiscount: body.totalAfterDiscount.toFixed(
                        body.decimalRoundTo
                    ),
                    tax: body.tax.toFixed(body.decimalRoundTo),
                    taxPercent: body.taxPercent.toString(),
                    taxName: body.taxName,
                    totalAfterTax: body.totalAfterTax.toFixed(
                        body.decimalRoundTo
                    ),
                    isCredit: body.isCredit,
                    paymentDueDate: body.paymentDueDate,
                    amountPaid: body.amountPaid.toString(),
                    amountDue: body.amountDue.toString(),
                    isFullyPaid: body.isFullyPaid,
                    paymentCompletionDate: body.paymentCompletionDate,
                    receiptNumber: body.receiptNumber,
                })
                .where(
                    and(
                        eq(purchases.purchaseId, body.purchaseId),
                        eq(purchases.companyId, body.companyId)
                    )
                )
                .returning();

            /* Storing items added, updated or removed separately */
            const itemsAdded: Array<PurchaseItemsRequest> = [];
            const itemsUpdated: Array<PurchaseItemsRequest> = [];
            const itemsRemoved: Array<{ itemId: number }> = [];

            /* To store old an new purchase items as objects for efficency */
            const oldPurchaseItemsAsObj: { [itemId: number]: PurchaseItem } =
                {};
            const updatedPurchaseItemsAsObj: {
                [itemId: number]: PurchaseItemsRequest;
            } = {};

            for (const item of body.oldItems) {
                oldPurchaseItemsAsObj[item.itemId] = item;
            }
            for (const item of body.items) {
                updatedPurchaseItemsAsObj[item.itemId] = item;
            }

            /* For each item in updated list */
            for (const item in updatedPurchaseItemsAsObj) {
                /* New item */
                const newItem = updatedPurchaseItemsAsObj[item];

                /* If item does not exist in old list: Its an addition */
                if (!oldPurchaseItemsAsObj[item]) {
                    itemsAdded.push(newItem);
                } else {
                    /* old item */
                    const old = oldPurchaseItemsAsObj[item];
                    /* If the fields below are different the item has been updated */
                    if (
                        old.itemName != newItem.itemName ||
                        Number(old.totalAfterTax) != newItem.totalAfterTax ||
                        Number(old.unitsPurchased) != newItem.unitsPurchased ||
                        old.unitName != newItem.unitName ||
                        Number(old.pricePerUnit) != newItem.pricePerUnit ||
                        Number(old.tax) != newItem.tax
                    ) {
                        itemsUpdated.push(newItem);
                    }
                    /* Delete object from old list */
                    delete oldPurchaseItemsAsObj[item];
                }
            }

            /* If items remain in old list, they are removed now, add them to remove list */
            if (Object.keys(oldPurchaseItemsAsObj).length) {
                for (const item in oldPurchaseItemsAsObj) {
                    itemsRemoved.push({ itemId: Number(item) });
                }
            }

            let addItemsReq;
            let updateItemsReq;
            let deleteItemsReq;
            /* Updating in db */

            for (const item of itemsAdded) {
                addItemsReq = tx
                    .insert(purchaseItems)
                    .values({
                        purchaseId: body.purchaseId,
                        itemId: item.itemId,
                        itemName: item.itemName,
                        companyId: item.companyId,
                        unitId: item.unitId,
                        unitName: item.unitName,
                        unitsPurchased: item.unitsPurchased.toString(),
                        pricePerUnit: item.pricePerUnit.toString(),
                        subtotal: item.subtotal.toFixed(body.decimalRoundTo),
                        tax: item.tax.toFixed(body.decimalRoundTo),
                        taxPercent: item.taxPercent.toString(),
                        totalAfterTax: item.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .returning();
            }
            for (const item of itemsUpdated) {
                updateItemsReq = tx
                    .update(purchaseItems)
                    .set({
                        purchaseId: body.purchaseId,
                        itemId: item.itemId,
                        itemName: item.itemName,
                        companyId: item.companyId,
                        unitId: item.unitId,
                        unitName: item.unitName,
                        unitsPurchased: item.unitsPurchased.toString(),
                        pricePerUnit: item.pricePerUnit.toString(),
                        subtotal: item.subtotal.toFixed(body.decimalRoundTo),
                        tax: item.tax.toFixed(body.decimalRoundTo),
                        taxPercent: item.taxPercent.toString(),
                        totalAfterTax: item.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .where(
                        and(
                            eq(purchaseItems.itemId, item.itemId),
                            eq(purchaseItems.purchaseId, body.purchaseId),
                            eq(purchaseItems.companyId, body.companyId)
                        )
                    )
                    .returning();
            }

            for (const item of itemsRemoved) {
                deleteItemsReq = tx
                    .delete(purchaseItems)
                    .where(
                        and(
                            eq(purchaseItems.itemId, item.itemId),
                            eq(purchaseItems.purchaseId, body.purchaseId),
                            eq(purchaseItems.companyId, body.companyId)
                        )
                    );
            }

            /* Parallel calls */
            const [addItemsRes, updatedItemsRes] = await Promise.all([
                addItemsReq,
                updateItemsReq,
                deleteItemsReq,
            ]);

            /* Final list of purchase items */
            let updatedItemsListInDb: Array<PurchaseItem> = [];
            if (addItemsRes) {
                updatedItemsListInDb = [...addItemsRes];
            }
            if (updatedItemsRes) {
                updatedItemsListInDb = [...updatedItemsRes];
            }

            return res.status(200).json(
                new ApiResponse<UpdatePurchaseResponse>(200, {
                    purchase: purchaseUpdated[0],
                    purchaseItems: updatedItemsListInDb,
                    message: "purchase updated successfully",
                })
            );
        });
    }
);
