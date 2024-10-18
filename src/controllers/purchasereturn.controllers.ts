import {Request, Response, NextFunction} from "express";
import asyncHandler from "../utils/async_handler";
import { AddPurchaseReturnRequest, AddPurchaseReturnResponse } from "../dto/purchasereturn/add_purchase_return_dto";
import { db, PurchaseReturnItem } from "../db";
import { purchaseReturnItems, purchaseReturns } from "db_service";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiResponse } from "../utils/ApiResponse";
import { GetAllPurchaseReturnsRequest, GetAllPurchaseReturnsResponse } from "../dto/purchasereturn/get_all_purchase_returns_dto";
import { and, asc, between, desc, eq, getTableColumns, gt, or, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError";
import { GetPurchaseReturnResponse } from "../dto/purchasereturn/get_purchase_return_dto";
import { GetPurchaseReturnsOfPurchaseResponse } from "../dto/purchasereturn/get_purchase_returns_of_purchase_dto";


export const getAllPurchaseReturns = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllPurchaseReturnsRequest;

        /* Custom Query */
        let customQuery;

        /* if query is passed */
        if (body.query) {
            let transactionDateQuery;
            let purchaseReturnNumberQuery;

            /* Transaction Dates Query */
            if (body?.query?.fromDate && body?.query?.toDate) {
                transactionDateQuery = between(
                    purchaseReturns.createdAt,
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
            /* Query by purchase return number */
            if (
                body?.query?.purchaseReturnNumber &&
                !isNaN(body?.query?.purchaseReturnNumber)
            ) {
                purchaseReturnNumberQuery = eq(
                    purchaseReturns.purchaseReturnNumber,
                    body.query.purchaseReturnNumber
                );
            }

            /* Combining the query */
            customQuery = and(transactionDateQuery, purchaseReturnNumberQuery);
        }

        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            whereClause = and(
                or(
                    sql`${purchaseReturns.createdAt} < ${body.cursor.createdAt}`,
                    and(
                        sql`${purchaseReturns.createdAt} = ${body.cursor.createdAt}`,
                        gt(purchaseReturns.purchaseReturnId, body.cursor.purchaseReturnId)
                    )
                ),
                eq(purchaseReturns.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = and(
                customQuery,
                eq(purchaseReturns.companyId, body.companyId)
            );
        }

        /* All purchase return columns */
        const purchaseReturnCloumns = getTableColumns(purchaseReturns);

        /* Default cols to select always */
        let colsToSelect = {
            purchaseReturnId: purchaseReturns.purchaseReturnId,
            createdAt: purchaseReturns.createdAt,
        };

        /* If select is passed */
        if (body?.select) {
            /* Keys of all purchase return columns */
            const purchaseReturnColumnKeys = Object.keys(purchaseReturnCloumns);

            /* Add column to colsToSelect */
            body.select?.forEach((col) => {
                /* If column name is invalid throw error */
                if (!purchaseReturnColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid col to select ${col}`, []);
                }

                colsToSelect = {
                    ...colsToSelect,
                    [col]: purchaseReturnCloumns[col],
                };
            });
        } else {
            /* Else, select all columns */
            colsToSelect = purchaseReturnCloumns;
        }

        /* DB Query */
        const allPurchaseReturns = await db
            .select(colsToSelect)
            .from(purchaseReturns)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(
                desc(purchaseReturns.createdAt),
                asc(purchaseReturns.purchaseReturnId)
            );

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allPurchaseReturns?.[allPurchaseReturns.length - 1];
        if (lastItem) {
            nextPageCursor = {
                purchaseReturnId: lastItem.purchaseReturnId,
                createdAt: lastItem.createdAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllPurchaseReturnsResponse<typeof allPurchaseReturns>>(
                200,
                {
                    purchaseReturns: allPurchaseReturns,
                    hasNextPage: nextPageCursor ? true : false,
                    nextPageCursor: nextPageCursor,
                }
            )
        );
    }
);

export const getPurchaseReturn = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Company ID and purchase return id */
        const companyId = Number(req?.query?.companyId);
        const purchaseReturnId = Number(req?.query?.purchaseReturnId);

        /* Request for getting the purchase return */
        const purchaseReturnRequest = db
            .select()
            .from(purchaseReturns)
            .where(
                and(
                    eq(purchaseReturns.purchaseReturnId, purchaseReturnId),
                    eq(purchaseReturns.companyId, companyId)
                )
            );

        /* Getting the purchase return items */
        const purchaseReturnItemsRequest = db
            .select()
            .from(purchaseReturnItems)
            .where(
                and(
                    eq(purchaseReturnItems.purchaseReturnId, purchaseReturnId),
                    eq(purchaseReturnItems.companyId, companyId)
                )
            );

        /* DB Requests */
        const [purchaseReturnResponse, purchaseReturnItemsResponse] = await Promise.all(
            [purchaseReturnRequest, purchaseReturnItemsRequest]
        );

        /* If no purchase return is found  */
        if (!purchaseReturnResponse.length) {
            throw new ApiError(
                400,
                "invalid purchase return id or company id passed",
                []
            );
        }
        return res.status(200).json(
            new ApiResponse<GetPurchaseReturnResponse>(200, {
                purchaseReturn: purchaseReturnResponse[0],
                purchaseReturnItems: purchaseReturnItemsResponse,
            })
        );
    }
);

export const getPurchaseReturnsOfPurchase = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Company ID and purchase id */
        const companyId = Number(req?.query?.companyId);
        const purchaseId = Number(req?.query?.purchaseId);

        /* Getting the purchase returns of the particular purchase */
        const purchaseReturnsResponse = await db
            .select()
            .from(purchaseReturns)
            .where(
                and(
                    eq(purchaseReturns.purchaseId, purchaseId),
                    eq(purchaseReturns.companyId, companyId)
                )
            );

        return res.status(200).json(
            new ApiResponse<GetPurchaseReturnsOfPurchaseResponse>(200, {
                purchaseReturns: purchaseReturnsResponse,
            })
        );
    }
);


export const addPurchaseReturn = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddPurchaseReturnRequest;

        await db.transaction(async (tx) => {
            /* Adding to purchase returns table */
            const purchaseReturnAdded = await tx
                .insert(purchaseReturns)
                .values({
                    createdAt: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    purchaseId: body.purchaseId,
                    purchaseReturnNumber: body.purchaseReturnNumber as number,
                    companyId: body.companyId,
                    subtotal: body.subtotal.toFixed(body.decimalRoundTo),
                    tax: body.tax.toFixed(body.decimalRoundTo),
                    taxPercent: body.taxPercent.toString(),
                    taxName: body.taxName,
                    totalAfterTax: body.totalAfterTax.toFixed(
                        body.decimalRoundTo
                    ),
                })
                .returning();


            /* Adding  items to purchaseReturnItems table */
            let purchaseReturnItemsAdded: PurchaseReturnItem[] = [];

            for (const purchaseReturnItem of body.items) {
                /* Adding to purchase return item table */
                const purchaseReturnItemAdded = await tx
                    .insert(purchaseReturnItems)
                    .values({
                        purchaseReturnId: purchaseReturnAdded[0].purchaseReturnId,
                        itemId: purchaseReturnItem.itemId,
                        itemName: purchaseReturnItem.itemName,
                        companyId: body.companyId,
                        unitId: purchaseReturnItem.unitId,
                        unitName: purchaseReturnItem.unitName,
                        unitsPurchased: purchaseReturnItem.unitsPurchased.toString(),
                        pricePerUnit: purchaseReturnItem.pricePerUnit.toString(),
                        subtotal: purchaseReturnItem.subtotal.toFixed(
                            body.decimalRoundTo
                        ),
                        tax: purchaseReturnItem.tax.toFixed(body.decimalRoundTo),
                        taxPercent: purchaseReturnItem.taxPercent.toString(),
                        totalAfterTax: purchaseReturnItem.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                        createdAt: purchaseReturnAdded[0].createdAt,
                    })
                    .returning();

                /* Adding item to purchaseReturnItemsAdded list */
                purchaseReturnItemsAdded.push(purchaseReturnItemAdded[0]);
            }

            return res.status(201).json(
                new ApiResponse<AddPurchaseReturnResponse>(200, {
                    purchaseReturn: purchaseReturnAdded[0],
                    purchaseReturnItems: purchaseReturnItemsAdded,
                })
            );
        });
    }
);
