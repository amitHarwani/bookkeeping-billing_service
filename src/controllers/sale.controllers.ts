import { quotations, saleItems, sales } from "db_service";
import {
    and,
    asc,
    between,
    desc,
    eq,
    getTableColumns,
    gt,
    or,
    sql,
} from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { db, Sale, SaleItem } from "../db";
import { RecordSaleRequest } from "../dto/item/record_sale_dto";
import {
    AddSaleRequest,
    AddSaleResponse,
    SaleItemsRequest,
} from "../dto/sale/add_sale_dto";
import {
    GetAllSalesRequest,
    GetAllSalesResponse,
} from "../dto/sale/get_all_sales_dto";
import { GetSaleResponse } from "../dto/sale/get_sale_dto";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/async_handler";
import { UpdateInventoryHelper } from "../utils/UpdateInventoryHelper";
import {
    UpdateSaleRequest,
    UpdateSaleResponse,
} from "../dto/sale/update_sale_dto";
import { RecordSaleUpdateRequest } from "../dto/item/record_sale_update_dto";

export const getAllSales = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllSalesRequest;

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
                partyIdQuery = eq(sales.partyId, body.query.partyId);
            }
            /* Querying by purchase type : Cash or Credit */
            if (
                typeof body?.query?.purchaseType === "string" &&
                body.query.purchaseType !== "ALL"
            ) {
                let isCreditTransactions = body.query.purchaseType === "CREDIT";
                purchaseTypeQuery = eq(sales.isCredit, isCreditTransactions);
            }
            /* Transaction Dates Query */
            if (
                body?.query?.fromTransactionDate &&
                body?.query?.toTransactionDate
            ) {
                transactionDateQuery = between(
                    sales.createdAt,
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
                overduePaymentsQuery = sql`${sales.paymentDueDate} > ${moment.utc().format(DATE_TIME_FORMATS.dateFormat)}`;
            }
            if (
                body?.query?.invoiceNumberSearchQuery &&
                !isNaN(body?.query?.invoiceNumberSearchQuery)
            ) {
                invoiceNumberQuery = eq(
                    sales.invoiceNumber,
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
            /* saleId should be greater than the last saleId fetched, and updatedAt must be equal to the lastUpdatedAt fetched
           or updatedAt should be less than the last updatedAt fetched, since sales are ordered by updated at.
           and filtering by companyId, and the custom query */
            whereClause = and(
                or(
                    sql`${sales.updatedAt} < ${body.cursor.updatedAt}`,
                    and(
                        sql`${sales.updatedAt} = ${body.cursor.updatedAt}`,
                        gt(sales.saleId, body.cursor.saleId)
                    )
                ),
                eq(sales.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* All sale columns */
        const saleCloumns = getTableColumns(sales);

        /* Default cols to select always */
        let colsToSelect = {
            saleId: sales.saleId,
            updatedAt: sales.updatedAt,
        };

        /* If select is passed */
        if (body?.select) {
            /* Keys of all sale columns */
            const saleColumnKeys = Object.keys(saleCloumns);

            /* Add column to colsToSelect */
            body.select?.forEach((col) => {
                /* If column name is invalid throw error */
                if (!saleColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid col to select ${col}`, []);
                }

                colsToSelect = { ...colsToSelect, [col]: saleCloumns[col] };
            });
        } else {
            /* Else, select all columns */
            colsToSelect = saleCloumns;
        }

        /* DB Query */
        const allSales = await db
            .select(colsToSelect)
            .from(sales)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(desc(sales.updatedAt), asc(sales.saleId));

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allSales?.[allSales.length - 1];
        if (lastItem) {
            nextPageCursor = {
                saleId: lastItem.saleId,
                updatedAt: lastItem.updatedAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllSalesResponse<typeof allSales>>(200, {
                sales: allSales,
                hasNextPage: nextPageCursor ? true : false,
                nextPageCursor: nextPageCursor,
            })
        );
    }
);

export const getSale = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Sale id and company id from query */
        const saleId = Number(req.query?.saleId);
        const companyId = Number(req.query?.companyId);

        /* Sale details */
        const saleDetailsRequest = db
            .select()
            .from(sales)
            .where(
                and(eq(sales.saleId, saleId), eq(sales.companyId, companyId))
            );

        /* Sale Items */
        const saleItemsRequest = db
            .select()
            .from(saleItems)
            .where(
                and(
                    eq(saleItems.saleId, saleId),
                    eq(saleItems.companyId, companyId)
                )
            );

        /* Parallel calls */
        const [saleDetails, saleItemsFromDB] = await Promise.all([
            saleDetailsRequest,
            saleItemsRequest,
        ]);

        return res.status(200).json(
            new ApiResponse<GetSaleResponse>(200, {
                sale: saleDetails[0],
                saleItems: saleItemsFromDB,
            })
        );
    }
);

export const addSale = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddSaleRequest;

        await db.transaction(async (tx) => {
            /* Adding to sales table */
            const saleAdded = await tx
                .insert(sales)
                .values({
                    createdAt: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    invoiceNumber: body.invoiceNumber as number,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    isNoPartyBill: body.isNoPartyBill,
                    doneBy: body.doneBy,
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
                })
                .returning();

            /* If quotation number is passed mark the quotation as completed, by setting the saleInvoiceNumber */
            if (body.quotationNumber) {
                await tx
                    .update(quotations)
                    .set({ saleId: saleAdded[0].saleId })
                    .where(
                        and(
                            eq(quotations.companyId, body.companyId),
                            eq(quotations.quotationNumber, body.quotationNumber)
                        )
                    );
            }
            /* Adding  items to saleItems table */
            let saleItemsAdded: SaleItem[] = [];

            let recordSaleReqBody: RecordSaleRequest = {
                companyId: body.companyId,
                saleId: saleAdded[0].saleId,
                items: [],
            };

            for (const saleItem of body.items) {
                const saleItemAdded = await tx
                    .insert(saleItems)
                    .values({
                        saleId: saleAdded[0].saleId,
                        itemId: saleItem.itemId,
                        itemName: saleItem.itemName,
                        companyId: saleItem.companyId,
                        unitId: saleItem.unitId,
                        unitName: saleItem.unitName,
                        unitsSold: saleItem.unitsSold.toString(),
                        pricePerUnit: saleItem.pricePerUnit.toString(),
                        subtotal: saleItem.subtotal.toFixed(
                            body.decimalRoundTo
                        ),
                        tax: saleItem.tax.toFixed(body.decimalRoundTo),
                        taxPercent: saleItem.taxPercent.toString(),
                        totalAfterTax: saleItem.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .returning();

                /* Adding to record sale request body */
                recordSaleReqBody.items.push({
                    itemId: saleItem.itemId,
                    sellingPricePerUnit: saleItem.pricePerUnit,
                    unitsSold: saleItem.unitsSold,
                });

                /* Adding item to saleItemsAdded list */
                saleItemsAdded.push(saleItemAdded[0]);
            }

            /* Updating Inventory */
            await new UpdateInventoryHelper().recordSales(recordSaleReqBody);

            return res.status(201).json(
                new ApiResponse<AddSaleResponse>(200, {
                    sale: saleAdded[0],
                    saleItems: saleItemsAdded,
                })
            );
        });
    }
);

export const updateSale = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdateSaleRequest;

        await db.transaction(async (tx) => {
            /* Updating in sales table */
            const saleUpdated = await tx
                .update(sales)
                .set({
                    invoiceNumber: body.invoiceNumber as number,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    isNoPartyBill: body.isNoPartyBill,
                    doneBy: body.doneBy,
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
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(sales.saleId, body.saleId),
                        eq(sales.companyId, body.companyId)
                    )
                )
                .returning();

            /* Storing items added, updated or removed separately */
            const itemsAdded: Array<SaleItemsRequest> = [];
            const itemsUpdated: Array<{
                old: SaleItemsRequest;
                new: SaleItemsRequest;
            }> = [];
            const itemsRemoved: Array<SaleItemsRequest> = [];

            /* To store old and new sale items as objects for efficency */
            const oldSaleItemsAsObj: {
                [itemId: number]: SaleItemsRequest;
            } = {};

            const newSaleItemsAsObj: {
                [itemId: number]: SaleItemsRequest;
            } = {};

            /* Old Items */
            for (const item of body.oldItems) {
                /* Removing createdAt, updatedAt and saleId from SaleItem type, 
                and converting string to number, to store as SaleItemsRequest type */
                const { saleId, createdAt, updatedAt, ...rest } = item;
                const oldSaleItem: SaleItemsRequest = {
                    ...rest,
                    unitsSold: Number(rest.unitsSold),
                    pricePerUnit: Number(rest.pricePerUnit),
                    subtotal: Number(rest.subtotal),
                    tax: Number(rest.tax),
                    taxPercent: Number(rest.taxPercent),
                    totalAfterTax: Number(rest.totalAfterTax),
                };
                oldSaleItemsAsObj[item.itemId] = oldSaleItem;
            }

            /* New Items */
            for (const item of body.items) {
                newSaleItemsAsObj[item.itemId] = item;
            }

            const recordSaleBody: RecordSaleRequest = {
                companyId: body.companyId,
                saleId: body.saleId,
                items: [],
            };
            const recordSaleUpdateBody: RecordSaleUpdateRequest = {
                companyId: body.companyId,
                saleId: body.saleId,
                items: {
                    itemsUpdated: [],
                    itemsRemoved: [],
                },
            };

            /* For each item in updated list */
            for (const item in newSaleItemsAsObj) {
                /* New item */
                const newItem = newSaleItemsAsObj[item];

                /* If item does not exist in old list: Its an addition */
                if (!oldSaleItemsAsObj[item]) {
                    itemsAdded.push(newItem);

                    /* Adding to record sale body */
                    recordSaleBody.items.push({
                        itemId: newItem.itemId,
                        sellingPricePerUnit: newItem.pricePerUnit,
                        unitsSold: newItem.unitsSold,
                    });
                } else {
                    /* old item */
                    const old = oldSaleItemsAsObj[item];
                    /* If the fields below are different the item has been updated */
                    if (
                        old.itemName != newItem.itemName ||
                        old.itemId != newItem.itemId ||
                        old.unitName != newItem.unitName ||
                        old.unitsSold != newItem.unitsSold ||
                        old.pricePerUnit != newItem.pricePerUnit ||
                        old.totalAfterTax != newItem.totalAfterTax ||
                        old.tax != newItem.tax
                    ) {
                        itemsUpdated.push({ old: old, new: newItem });

                        /* Adding to record sale update body */
                        recordSaleUpdateBody?.items?.itemsUpdated?.push({
                            old: {
                                itemId: old.itemId,
                                sellingPricePerUnit: old.pricePerUnit,
                                unitsSold: old.unitsSold,
                            },
                            new: {
                                itemId: newItem.itemId,
                                sellingPricePerUnit: newItem.pricePerUnit,
                                unitsSold: newItem.unitsSold,
                            },
                        });
                    }
                    /* Delete object from old list */
                    delete oldSaleItemsAsObj[item];
                }
            }

            /* If items remain in old list, they are removed now, add them to remove list */
            if (Object.keys(oldSaleItemsAsObj).length) {
                for (const item in oldSaleItemsAsObj) {
                    itemsRemoved.push(oldSaleItemsAsObj[item]);
                    /* Adding to record sale update body */
                    recordSaleUpdateBody.items.itemsRemoved?.push({
                        itemId: oldSaleItemsAsObj[item].itemId,
                        sellingPricePerUnit:
                            oldSaleItemsAsObj[item].pricePerUnit,
                        unitsSold: oldSaleItemsAsObj[item].unitsSold,
                    });
                }
            }

            let addItemsReq = [];
            let updateItemsReq = [];
            let deleteItemsReq = [];

            /* Updating in db */
            /* Adding Item */
            for (const item of itemsAdded) {
                addItemsReq.push(tx
                    .insert(saleItems)
                    .values({
                        saleId: body.saleId,
                        itemId: item.itemId,
                        itemName: item.itemName,
                        companyId: item.companyId,
                        unitId: item.unitId,
                        unitName: item.unitName,
                        unitsSold: item.unitsSold.toString(),
                        pricePerUnit: item.pricePerUnit.toString(),
                        subtotal: item.subtotal.toFixed(body.decimalRoundTo),
                        tax: item.tax.toFixed(body.decimalRoundTo),
                        taxPercent: item.taxPercent.toString(),
                        totalAfterTax: item.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .returning());
            }
            /* Updating Items */
            for (const item of itemsUpdated) {
                updateItemsReq.push(tx
                    .update(saleItems)
                    .set({
                        saleId: body.saleId,
                        itemId: item.new.itemId,
                        itemName: item.new.itemName,
                        companyId: item.new.companyId,
                        unitId: item.new.unitId,
                        unitName: item.new.unitName,
                        unitsSold: item.new.unitsSold.toString(),
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
                            eq(saleItems.itemId, item.new.itemId),
                            eq(saleItems.saleId, body.saleId),
                            eq(saleItems.companyId, body.companyId)
                        )
                    )
                    .returning());
            }
            /* Removing Items */
            for (const item of itemsRemoved) {
                deleteItemsReq.push(tx
                    .delete(saleItems)
                    .where(
                        and(
                            eq(saleItems.itemId, item.itemId),
                            eq(saleItems.saleId, body.saleId),
                            eq(saleItems.companyId, body.companyId)
                        )
                    ));
            }

            /* Parallel calls */
            const [addItemsRes, updatedItemsRes] = await Promise.all([
                ...addItemsReq,
                ...updateItemsReq,
                ...deleteItemsReq,
            ]);

            /* Final list of purchase items */
            let updatedItemsListInDb: Array<SaleItem> = [];
            if (addItemsRes) {
                updatedItemsListInDb = [...addItemsRes];
            }
            if (updatedItemsRes) {
                updatedItemsListInDb = [...updatedItemsRes];
            }

            /* Update Inventory helper */
            const updateInventoryHelper = new UpdateInventoryHelper();

            /* If items were added recordSales */
            if (recordSaleBody.items.length) {
                await updateInventoryHelper.recordSales(recordSaleBody);
            }
            /* If items were updated or removed record sale update */
            if (
                recordSaleUpdateBody.items.itemsRemoved?.length ||
                recordSaleUpdateBody.items.itemsUpdated?.length
            ) {
                await updateInventoryHelper.recordSalesUpdate(
                    recordSaleUpdateBody
                );
            }

            return res.status(200).json(
                new ApiResponse<UpdateSaleResponse>(200, {
                    sale: saleUpdated[0],
                    saleItems: updatedItemsListInDb,
                    message: "sale updated successfully",
                })
            );
        });
    }
);
