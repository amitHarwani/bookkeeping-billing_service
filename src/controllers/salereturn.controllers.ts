import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetAllSaleReturnsRequest,
    GetAllSaleReturnsResponse,
} from "../dto/salereturn/get_all_sale_returns_dto";
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
import {
    cashInOut,
    saleItems,
    saleReturnItems,
    saleReturns,
    sales,
} from "db_service";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiError } from "../utils/ApiError";
import { db, SaleItem, SaleReturnItem } from "../db";
import { ApiResponse } from "../utils/ApiResponse";
import { GetSaleReturnResponse } from "../dto/salereturn/get_sale_return_dto";
import {
    AddSaleReturnRequest,
    AddSaleReturnResponse,
} from "../dto/salereturn/add_sale_return_dto";
import { GetSaleReturnsOfSaleResponse } from "../dto/salereturn/get_sale_returns_of_sale_dto";

export const getAllSaleReturns = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllSaleReturnsRequest;

        /* Custom Query */
        let customQuery;

        /* if query is passed */
        if (body.query) {
            let transactionDateQuery;
            let saleReturnNumberQuery;

            /* Transaction Dates Query */
            if (body?.query?.fromDate && body?.query?.toDate) {
                transactionDateQuery = between(
                    saleReturns.createdAt,
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
            /* Query by sale return number */
            if (
                body?.query?.saleReturnNumber &&
                !isNaN(body?.query?.saleReturnNumber)
            ) {
                saleReturnNumberQuery = eq(
                    saleReturns.saleReturnNumber,
                    body.query.saleReturnNumber
                );
            }

            /* Combining the query */
            customQuery = and(transactionDateQuery, saleReturnNumberQuery);
        }

        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            whereClause = and(
                or(
                    sql`${saleReturns.createdAt} < ${body.cursor.createdAt}`,
                    and(
                        sql`${saleReturns.createdAt} = ${body.cursor.createdAt}`,
                        gt(saleReturns.saleReturnId, body.cursor.saleReturnId)
                    )
                ),
                eq(saleReturns.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = and(
                customQuery,
                eq(saleReturns.companyId, body.companyId)
            );
        }

        /* All sale return columns */
        const saleReturnCloumns = getTableColumns(saleReturns);

        /* Default cols to select always */
        let colsToSelect = {
            saleReturnId: saleReturns.saleReturnId,
            createdAt: saleReturns.createdAt,
        };

        /* If select is passed */
        if (body?.select) {
            /* Keys of all sale return columns */
            const saleReturnColumnKeys = Object.keys(saleReturnCloumns);

            /* Add column to colsToSelect */
            body.select?.forEach((col) => {
                /* If column name is invalid throw error */
                if (!saleReturnColumnKeys.includes(col)) {
                    throw new ApiError(422, `invalid col to select ${col}`, []);
                }

                colsToSelect = {
                    ...colsToSelect,
                    [col]: saleReturnCloumns[col],
                };
            });
        } else {
            /* Else, select all columns */
            colsToSelect = saleReturnCloumns;
        }

        /* DB Query */
        const allSaleReturns = await db
            .select(colsToSelect)
            .from(saleReturns)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(
                desc(saleReturns.createdAt),
                asc(saleReturns.saleReturnId)
            );

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allSaleReturns?.[allSaleReturns.length - 1];
        if (lastItem) {
            nextPageCursor = {
                saleReturnId: lastItem.saleReturnId,
                createdAt: lastItem.createdAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllSaleReturnsResponse<typeof allSaleReturns>>(
                200,
                {
                    saleReturns: allSaleReturns,
                    hasNextPage: nextPageCursor ? true : false,
                    nextPageCursor: nextPageCursor,
                }
            )
        );
    }
);

export const getSaleReturn = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Company ID and sale return id */
        const companyId = Number(req?.query?.companyId);
        const saleReturnId = Number(req?.query?.saleReturnId);

        /* Getting the sale return */
        const saleReturnRequest = db
            .select()
            .from(saleReturns)
            .where(
                and(
                    eq(saleReturns.saleReturnId, saleReturnId),
                    eq(saleReturns.companyId, companyId)
                )
            );

        /* Getting the sale return items */
        const saleReturnItemsRequest = db
            .select()
            .from(saleReturnItems)
            .where(
                and(
                    eq(saleReturnItems.saleReturnId, saleReturnId),
                    eq(saleReturnItems.companyId, companyId)
                )
            );

        /* DB Requests */
        const [saleReturnResponse, saleReturnItemsResponse] = await Promise.all(
            [saleReturnRequest, saleReturnItemsRequest]
        );

        /* If no sale return is found  */
        if (!saleReturnResponse.length) {
            throw new ApiError(
                400,
                "invalid sale return id or company id passed",
                []
            );
        }
        return res.status(200).json(
            new ApiResponse<GetSaleReturnResponse>(200, {
                saleReturn: saleReturnResponse[0],
                saleReturnItems: saleReturnItemsResponse,
            })
        );
    }
);

export const getSaleReturnOfSale = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Company ID and sale id */
        const companyId = Number(req?.query?.companyId);
        const saleId = Number(req?.query?.saleId);

        /* Getting the sale returns of the particular sale */
        const saleReturnsResponse = await db
            .select()
            .from(saleReturns)
            .where(
                and(
                    eq(saleReturns.saleId, saleId),
                    eq(saleReturns.companyId, companyId)
                )
            );

        return res.status(200).json(
            new ApiResponse<GetSaleReturnsOfSaleResponse>(200, {
                saleReturns: saleReturnsResponse,
            })
        );
    }
);

export const addSaleReturn = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddSaleReturnRequest;

        await db.transaction(async (tx) => {
            /* Adding to sale returns table */
            const saleReturnAdded = await tx
                .insert(saleReturns)
                .values({
                    createdAt: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    saleId: body.saleId,
                    saleReturnNumber: body.saleReturnNumber as number,
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

            if (body.cashOut > 0) {
                /* Request to add record in cash inout table */
                await tx.insert(cashInOut).values({
                    transactionDateTime: moment
                        .utc(
                            body.createdAt,
                            DATE_TIME_FORMATS.dateTimeFormat24hr
                        )
                        .toDate(),
                    companyId: body.companyId,
                    cashOut: body.cashOut.toFixed(body.decimalRoundTo),
                    saleReturnId: saleReturnAdded[0].saleReturnId,
                });
            }

            /* Adding  items to saleReturnItems table */
            let saleReturnItemsAdded: SaleReturnItem[] = [];

            for (const saleReturnItem of body.items) {
                /* Adding to sale return item table */
                const saleReturnItemAdded = await tx
                    .insert(saleReturnItems)
                    .values({
                        saleReturnId: saleReturnAdded[0].saleReturnId,
                        itemId: saleReturnItem.itemId,
                        itemName: saleReturnItem.itemName,
                        companyId: body.companyId,
                        unitId: saleReturnItem.unitId,
                        unitName: saleReturnItem.unitName,
                        unitsSold: saleReturnItem.unitsSold.toString(),
                        pricePerUnit: saleReturnItem.pricePerUnit.toString(),
                        subtotal: saleReturnItem.subtotal.toFixed(
                            body.decimalRoundTo
                        ),
                        tax: saleReturnItem.tax.toFixed(body.decimalRoundTo),
                        taxPercent: saleReturnItem.taxPercent.toString(),
                        totalAfterTax: saleReturnItem.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                        createdAt: saleReturnAdded[0].createdAt,
                    })
                    .returning();

                /* Adding item to saleItemsAdded list */
                saleReturnItemsAdded.push(saleReturnItemAdded[0]);
            }

            return res.status(201).json(
                new ApiResponse<AddSaleReturnResponse>(200, {
                    saleReturn: saleReturnAdded[0],
                    saleReturnItems: saleReturnItemsAdded,
                })
            );
        });
    }
);
