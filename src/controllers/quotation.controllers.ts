import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetAllQuotationsRequest,
    GetAllQuotationsResponse,
} from "../dto/quotation/get_all_quotations_dto";
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
import { quotationItems, quotations } from "db_service";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiError } from "../utils/ApiError";
import { db, QuotationItem } from "../db";
import { ApiResponse } from "../utils/ApiResponse";
import {
    AddQuotationRequest,
    AddQuotationResponse,
    QuotationItemsRequest,
} from "../dto/quotation/add_quotation_dto";
import { GetQuotationResponse } from "../dto/quotation/get_quotation_dto";
import { UpdateQuotationRequest, UpdateQuotationResponse } from "../dto/quotation/update_quotation_dto";

export const getAllQuotations = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllQuotationsRequest;

        /* Custom Query */
        let customQuery;

        /* if query is passed */
        if (body.query) {
            let partyIdQuery;
            let transactionDateQuery;
            let quotationNumberQuery;

            /* Querying by partyId */
            if (typeof body?.query?.partyId === "number") {
                partyIdQuery = eq(quotations.partyId, body.query.partyId);
            }
            /* Transaction Dates Query */
            if (body?.query?.fromDate && body?.query?.toDate) {
                transactionDateQuery = between(
                    quotations.createdAt,
                    moment
                        .utc(
                            body.query.fromDate,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    moment
                        .utc(
                            body.query.toDate,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate()
                );
            }
            if (
                body?.query?.quotationNumberSearchQuery &&
                !isNaN(body?.query?.quotationNumberSearchQuery)
            ) {
                quotationNumberQuery = eq(
                    quotations.quotationNumber,
                    body.query.quotationNumberSearchQuery
                );
            }

            /* Combining the query */
            customQuery = and(
                partyIdQuery,
                transactionDateQuery,
                quotationNumberQuery
            );
        }

        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            /* quotationId should be greater than the last quotationId fetched, and updatedAt must be equal to the lastUpdatedAt fetched
           or updatedAt should be less than the last updatedAt fetched, since quotations are ordered by updated at.
           and filtering by companyId, and the custom query */
            whereClause = and(
                or(
                    sql`${quotations.updatedAt} < ${body.cursor.updatedAt}`,
                    and(
                        sql`${quotations.updatedAt} = ${body.cursor.updatedAt}`,
                        gt(quotations.quotationId, body.cursor.quotationId)
                    )
                ),
                eq(quotations.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* All quotation columns */
        const quotationColumns = getTableColumns(quotations);

        /* Default cols to select always */
        let colsToSelect = {
            quotationId: quotations.quotationId,
            updatedAt: quotations.updatedAt,
        };

        /* If select is passed */
        if (body?.select) {
            /* Keys of all quptation columns */
            const quotationColumnKeys = Object.keys(quotationColumns);

            /* Add column to colsToSelect */
            body.select?.forEach((col) => {
                /* If column name is invalid throw error */
                if (!quotationColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid col to select ${col}`, []);
                }

                colsToSelect = {
                    ...colsToSelect,
                    [col]: quotationColumns[col],
                };
            });
        } else {
            /* Else, select all columns */
            colsToSelect = quotationColumns;
        }

        /* DB Query */
        const allQuotations = await db
            .select(colsToSelect)
            .from(quotations)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(desc(quotations.updatedAt), asc(quotations.quotationId));

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allQuotations?.[allQuotations.length - 1];
        if (lastItem) {
            nextPageCursor = {
                quotationId: lastItem.quotationId,
                updatedAt: lastItem.updatedAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllQuotationsResponse<typeof allQuotations>>(
                200,
                {
                    quotations: allQuotations,
                    hasNextPage: nextPageCursor ? true : false,
                    nextPageCursor: nextPageCursor,
                }
            )
        );
    }
);

export const addQuotation = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddQuotationRequest;

        await db.transaction(async (tx) => {
            /* Adding to quotation table */
            const quotationAdded = await tx
                .insert(quotations)
                .values({
                    quotationNumber: body.quotationNumber as number,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    createdBy: body.createdBy,
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
                })
                .returning();

            /* Adding  items to quotationItems table */
            let quotationItemsAdded: QuotationItem[] = [];

            for (const item of body.items) {
                const quotationItemAdded = await tx
                    .insert(quotationItems)
                    .values({
                        quotationId: quotationAdded[0].quotationId,
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
                    .returning();

                /* Adding item to quotationItemsAdded list */
                quotationItemsAdded.push(quotationItemAdded[0]);
            }

            return res.status(201).json(
                new ApiResponse<AddQuotationResponse>(201, {
                    quotation: quotationAdded[0],
                    quotationItems: quotationItemsAdded,
                    message: "quotation added successfully",
                })
            );
        });
    }
);

export const getQuotation = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Quotation id and company id from query */
        const quotationId = Number(req.query?.quotationId);
        const companyId = Number(req.query?.companyId);

        /* Quotation details */
        const quotationDetailsRequest = db
            .select()
            .from(quotations)
            .where(
                and(
                    eq(quotations.quotationId, quotationId),
                    eq(quotations.companyId, companyId)
                )
            );

        /* Quotation Items */
        const quotationItemsRequest = db
            .select()
            .from(quotationItems)
            .where(
                and(
                    eq(quotations.quotationId, quotationId),
                    eq(quotations.companyId, companyId)
                )
            );

        /* Parallel calls */
        const [quotationDetails, quotationItemsFromDB] = await Promise.all([
            quotationDetailsRequest,
            quotationItemsRequest,
        ]);

        return res.status(200).json(
            new ApiResponse<GetQuotationResponse>(200, {
                quotation: quotationDetails[0],
                quotationItems: quotationItemsFromDB,
            })
        );
    }
);

export const updateQuotation = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdateQuotationRequest;

        await db.transaction(async (tx) => {
            /* Updating in quotations table */
            const quotationUpdated = await tx
                .update(quotations)
                .set({
                    quotationNumber: body.quotationNumber as number,
                    companyId: body.companyId,
                    partyId: body.partyId,
                    partyName: body.partyName,
                    createdBy: body.createdBy,
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
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(quotations.quotationId, body.quotationId),
                        eq(quotations.companyId, body.companyId)
                    )
                )
                .returning();

            /* Storing items added, updated or removed separately */
            const itemsAdded: Array<QuotationItemsRequest> = [];
            const itemsUpdated: Array<{
                old: QuotationItemsRequest;
                new: QuotationItemsRequest;
            }> = [];
            const itemsRemoved: Array<QuotationItemsRequest> = [];

            /* To store old and new quotation items as objects for efficency */
            const oldQuotationItemsAsObj: {
                [itemId: number]: QuotationItemsRequest;
            } = {};

            const newQuotationItemsAsObj: {
                [itemId: number]: QuotationItemsRequest;
            } = {};

            /* Old Items */
            for (const item of body.oldItems) {
                /* Removing createdAt, updatedAt and quotationId from QuotationItem type, 
                and converting string to number, to store as QuotationItemsRequest type */
                const { quotationId, createdAt, updatedAt, ...rest } = item;
                const oldQuotationItem: QuotationItemsRequest = {
                    ...rest,
                    unitsSold: Number(rest.unitsSold),
                    pricePerUnit: Number(rest.pricePerUnit),
                    subtotal: Number(rest.subtotal),
                    tax: Number(rest.tax),
                    taxPercent: Number(rest.taxPercent),
                    totalAfterTax: Number(rest.totalAfterTax),
                };
                oldQuotationItemsAsObj[item.itemId] = oldQuotationItem;
            }

            /* New Items */
            for (const item of body.items) {
                newQuotationItemsAsObj[item.itemId] = item;
            }

            /* For each item in updated list */
            for (const item in newQuotationItemsAsObj) {
                /* New item */
                const newItem = newQuotationItemsAsObj[item];

                /* If item does not exist in old list: Its an addition */
                if (!oldQuotationItemsAsObj[item]) {
                    itemsAdded.push(newItem);
                } else {
                    /* old item */
                    const old = oldQuotationItemsAsObj[item];
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
                    }
                    /* Delete object from old list */
                    delete oldQuotationItemsAsObj[item];
                }
            }

            /* If items remain in old list, they are removed now, add them to remove list */
            if (Object.keys(oldQuotationItemsAsObj).length) {
                for (const item in oldQuotationItemsAsObj) {
                    itemsRemoved.push(oldQuotationItemsAsObj[item]);
                }
            }

            let addItemsReq;
            let updateItemsReq;
            let deleteItemsReq;

            /* Updating in db */
            /* Adding Item */
            for (const item of itemsAdded) {
                addItemsReq = tx
                    .insert(quotationItems)
                    .values({
                        quotationId: body.quotationId,
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
                    .returning();
            }
            /* Updating Items */
            for (const item of itemsUpdated) {
                updateItemsReq = tx
                    .update(quotationItems)
                    .set({
                        quotationId: body.quotationId,
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
                            eq(quotationItems.itemId, item.new.itemId),
                            eq(quotationItems.quotationId, body.quotationId),
                            eq(quotationItems.companyId, body.companyId)
                        )
                    )
                    .returning();
            }
            /* Removing Items */
            for (const item of itemsRemoved) {
                deleteItemsReq = tx
                    .delete(quotationItems)
                    .where(
                        and(
                            eq(quotationItems.itemId, item.itemId),
                            eq(quotationItems.quotationId, body.quotationId),
                            eq(quotationItems.companyId, body.companyId)
                        )
                    );
            }

            /* Parallel calls */
            const [addItemsRes, updatedItemsRes] = await Promise.all([
                addItemsReq,
                updateItemsReq,
                deleteItemsReq,
            ]);

            /* Final list of quotation items */
            let updatedItemsListInDb: Array<QuotationItem> = [];
            if (addItemsRes) {
                updatedItemsListInDb = [...addItemsRes];
            }
            if (updatedItemsRes) {
                updatedItemsListInDb = [...updatedItemsRes];
            }

            return res.status(200).json(
                new ApiResponse<UpdateQuotationResponse>(200, {
                    quotation: quotationUpdated[0],
                    quotationItems: updatedItemsListInDb,
                    message: "quotation updated successfully",
                })
            );
        });
    }
);
