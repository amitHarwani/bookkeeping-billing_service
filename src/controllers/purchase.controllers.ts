import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    AddPurchaseRequest,
    AddPurchaseResponse,
    PurchaseItemsRequest,
} from "../dto/purchase/add_purchase_dto";
import { db, PurchaseItem } from "../db";
import {
    cashInOut,
    items,
    purchaseItems,
    purchases,
    saleItems,
} from "db_service";
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
import { RecordPurchaseUpdateRequest } from "../dto/item/record_purchase_update_dto";

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
                overduePaymentsQuery = and(
                    eq(purchases.isFullyPaid, false),
                    sql`${purchases.paymentDueDate} <= ${moment.utc().format(DATE_TIME_FORMATS.dateFormat)}`
                );
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
                    createdAt: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
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
                    paymentDueDate: body.paymentDueDate
                        ? moment
                              .utc(
                                  body.paymentDueDate,
                                  DATE_TIME_FORMATS.dateTimeFormat24hr
                              )
                              .toDate()
                        : null,
                    amountPaid: body.amountPaid.toString(),
                    amountDue: body.amountDue.toString(),
                    isFullyPaid: body.isFullyPaid,
                    paymentCompletionDate: body.paymentCompletionDate
                        ? moment
                              .utc(
                                  body.paymentCompletionDate,
                                  DATE_TIME_FORMATS.dateTimeFormat24hr
                              )
                              .toDate()
                        : null,
                    receiptNumber: body.receiptNumber,
                })
                .returning();

            /* If amount paid is not 0, add to cash in out table */
            if (body.amountPaid) {
                await tx.insert(cashInOut).values({
                    transactionDateTime: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    companyId: body.companyId,
                    cashOut: body.amountPaid.toString(),
                    purchaseId: purchaseAdded[0].purchaseId,
                });
            }

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
            const updatePurchaseDBRequest = tx
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
                    paymentDueDate: body.paymentDueDate
                        ? moment
                              .utc(
                                  body.paymentDueDate,
                                  DATE_TIME_FORMATS.dateTimeFormat24hr
                              )
                              .toDate()
                        : null,
                    amountPaid: body.amountPaid.toString(),
                    amountDue: body.amountDue.toString(),
                    isFullyPaid: body.isFullyPaid,
                    paymentCompletionDate: body.paymentCompletionDate
                        ? moment
                              .utc(
                                  body.paymentCompletionDate,
                                  DATE_TIME_FORMATS.dateTimeFormat24hr
                              )
                              .toDate()
                        : null,
                    receiptNumber: body.receiptNumber,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(purchases.purchaseId, body.purchaseId),
                        eq(purchases.companyId, body.companyId)
                    )
                )
                .returning();

            /* Adding to cash in out table, the difference of current amount paid - old amount paid */
            let addToCashInOutDBRequest;

            if (body.amountPaid != body.oldAmountPaid) {
                addToCashInOutDBRequest = tx.insert(cashInOut).values({
                    transactionDateTime: new Date(),
                    companyId: body.companyId,
                    cashOut: (body.amountPaid - body.oldAmountPaid).toString(),
                    purchaseId: body.purchaseId
                });
            }

            /* Parallel request to update purchase and insert into cash in out table */
            const [purchaseUpdated] = await Promise.all([
                updatePurchaseDBRequest,
                addToCashInOutDBRequest,
            ]);

            /* Storing items added, updated or removed separately */
            const itemsAdded: Array<PurchaseItemsRequest> = [];
            const itemsUpdated: Array<{
                old: PurchaseItemsRequest;
                new: PurchaseItemsRequest;
            }> = [];
            const itemsRemoved: Array<PurchaseItemsRequest> = [];

            /* To store old and new purchase items as objects for efficency */
            const oldPurchaseItemsAsObj: {
                [itemId: number]: PurchaseItemsRequest;
            } = {};

            const newPurchaseItemsAsObj: {
                [itemId: number]: PurchaseItemsRequest;
            } = {};

            /* Old Items */
            for (const item of body.oldItems) {
                /* Removing createdAt, updatedAt and purchaseId from PurchaseItem type, 
                and converting string to number, to store as PurchaseItemsRequest type */
                const { purchaseId, createdAt, updatedAt, ...rest } = item;
                const oldPurchaseItem: PurchaseItemsRequest = {
                    ...rest,
                    unitsPurchased: Number(rest.unitsPurchased),
                    pricePerUnit: Number(rest.pricePerUnit),
                    subtotal: Number(rest.subtotal),
                    tax: Number(rest.tax),
                    taxPercent: Number(rest.taxPercent),
                    totalAfterTax: Number(rest.totalAfterTax),
                };
                oldPurchaseItemsAsObj[item.itemId] = oldPurchaseItem;
            }

            /* New Items */
            for (const item of body.items) {
                newPurchaseItemsAsObj[item.itemId] = item;
            }

            const recordPurchaseBody: RecordPurchaseRequest = {
                companyId: body.companyId,
                purchaseId: body.purchaseId,
                items: [],
            };
            const recordPurchaseUpdateBody: RecordPurchaseUpdateRequest = {
                companyId: body.companyId,
                purchaseId: body.purchaseId,
                items: {
                    itemsUpdated: [],
                    itemsRemoved: [],
                },
            };

            /* For each item in updated list */
            for (const item in newPurchaseItemsAsObj) {
                /* New item */
                const newItem = newPurchaseItemsAsObj[item];

                /* If item does not exist in old list: Its an addition */
                if (!oldPurchaseItemsAsObj[item]) {
                    itemsAdded.push(newItem);

                    /* Adding to record purchase body */
                    recordPurchaseBody.items.push({
                        itemId: newItem.itemId,
                        pricePerUnit: newItem.pricePerUnit,
                        unitsPurchased: newItem.unitsPurchased,
                    });
                } else {
                    /* old item */
                    const old = oldPurchaseItemsAsObj[item];
                    /* If the fields below are different the item has been updated */
                    if (
                        old.itemName != newItem.itemName ||
                        old.itemId != newItem.itemId ||
                        old.unitName != newItem.unitName ||
                        old.unitsPurchased != newItem.unitsPurchased ||
                        old.pricePerUnit != newItem.pricePerUnit ||
                        old.totalAfterTax != newItem.totalAfterTax ||
                        old.tax != newItem.tax
                    ) {
                        itemsUpdated.push({ old: old, new: newItem });

                        /* Adding to record purchase update body */
                        recordPurchaseUpdateBody?.items?.itemsUpdated?.push({
                            old: {
                                itemId: old.itemId,
                                pricePerUnit: old.pricePerUnit,
                                unitsPurchased: old.unitsPurchased,
                            },
                            new: {
                                itemId: newItem.itemId,
                                pricePerUnit: newItem.pricePerUnit,
                                unitsPurchased: newItem.unitsPurchased,
                            },
                        });
                    }
                    /* Delete object from old list */
                    delete oldPurchaseItemsAsObj[item];
                }
            }

            /* If items remain in old list, they are removed now, add them to remove list */
            if (Object.keys(oldPurchaseItemsAsObj).length) {
                for (const item in oldPurchaseItemsAsObj) {
                    itemsRemoved.push(oldPurchaseItemsAsObj[item]);
                    /* Adding to record purchase update body */
                    recordPurchaseUpdateBody.items.itemsRemoved?.push({
                        itemId: oldPurchaseItemsAsObj[item].itemId,
                        pricePerUnit: oldPurchaseItemsAsObj[item].pricePerUnit,
                        unitsPurchased:
                            oldPurchaseItemsAsObj[item].unitsPurchased,
                    });
                }
            }

            let addItemsReq = [];
            let updateItemsReq = [];
            let deleteItemsReq = [];

            /* Updating in db */
            /* Adding Item */
            for (const item of itemsAdded) {
                addItemsReq.push(
                    tx
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
                            subtotal: item.subtotal.toFixed(
                                body.decimalRoundTo
                            ),
                            tax: item.tax.toFixed(body.decimalRoundTo),
                            taxPercent: item.taxPercent.toString(),
                            totalAfterTax: item.totalAfterTax.toFixed(
                                body.decimalRoundTo
                            ),
                        })
                        .returning()
                );
            }
            /* Updating Items */
            for (const item of itemsUpdated) {
                updateItemsReq.push(
                    tx
                        .update(purchaseItems)
                        .set({
                            purchaseId: body.purchaseId,
                            itemId: item.new.itemId,
                            itemName: item.new.itemName,
                            companyId: item.new.companyId,
                            unitId: item.new.unitId,
                            unitName: item.new.unitName,
                            unitsPurchased: item.new.unitsPurchased.toString(),
                            pricePerUnit: item.new.pricePerUnit.toString(),
                            subtotal: item.new.subtotal.toFixed(
                                body.decimalRoundTo
                            ),
                            tax: item.new.tax.toFixed(body.decimalRoundTo),
                            taxPercent: item.new.taxPercent.toString(),
                            totalAfterTax: item.new.totalAfterTax.toFixed(
                                body.decimalRoundTo
                            ),
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(purchaseItems.itemId, item.new.itemId),
                                eq(purchaseItems.purchaseId, body.purchaseId),
                                eq(purchaseItems.companyId, body.companyId)
                            )
                        )
                        .returning()
                );
            }
            /* Removing Items */
            for (const item of itemsRemoved) {
                deleteItemsReq.push(
                    tx
                        .delete(purchaseItems)
                        .where(
                            and(
                                eq(purchaseItems.itemId, item.itemId),
                                eq(purchaseItems.purchaseId, body.purchaseId),
                                eq(purchaseItems.companyId, body.companyId)
                            )
                        )
                );
            }

            /* Parallel calls */
            const [addItemsRes, updatedItemsRes] = await Promise.all([
                ...addItemsReq,
                ...updateItemsReq,
                ...deleteItemsReq,
            ]);

            /* Final list of purchase items */
            let updatedItemsListInDb: Array<PurchaseItem> = [];
            if (addItemsRes) {
                updatedItemsListInDb = [...addItemsRes];
            }
            if (updatedItemsRes) {
                updatedItemsListInDb = [...updatedItemsRes];
            }

            /* Update Inventory helper */
            const updateInventoryHelper = new UpdateInventoryHelper();

            /* If items were added recordPurchase */
            if (recordPurchaseBody.items.length) {
                await updateInventoryHelper.recordPurchase(recordPurchaseBody);
            }
            /* If items were updated or removed record purchase update */
            if (
                recordPurchaseUpdateBody.items.itemsRemoved?.length ||
                recordPurchaseUpdateBody.items.itemsUpdated?.length
            ) {
                await updateInventoryHelper.recordPurchaseUpdate(
                    recordPurchaseUpdateBody
                );
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
