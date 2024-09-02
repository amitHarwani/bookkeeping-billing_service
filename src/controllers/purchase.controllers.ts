import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import {
    AddPurchaseRequest,
    AddPurchaseResponse,
} from "../dto/purchase/add_purchase_dto";
import { db, PurchaseItem } from "../db";
import { purchaseItems, purchases } from "db_service";
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
    or,
    sql,
} from "drizzle-orm";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiError } from "../utils/ApiError";
import axios from "axios";
import { RecordPurchaseRequest } from "../dto/item/record_purchase_dto";

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
            .orderBy(desc(purchases.updatedAt), asc(purchases.partyId));

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
            let updateInventoryBody: RecordPurchaseRequest = {
                purchaseId: null,
                itemsPurchased: [],
            };

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

            updateInventoryBody.purchaseId = purchaseAdded[0].purchaseId;

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
                        tax: body.tax.toFixed(body.decimalRoundTo),
                        taxPercent: purchaseItem.taxPercent.toString(),
                        totalAfterTax: purchaseItem.totalAfterTax.toFixed(
                            body.decimalRoundTo
                        ),
                    })
                    .returning();
                purchaseItemsAdded.push(purchaseItemAdded[0]);

                /* Adding to updateInventoryBody request */
                updateInventoryBody.itemsPurchased.push({
                    companyId: body.companyId,
                    itemId: purchaseItem.itemId,
                    pricePerUnit: purchaseItem.pricePerUnit,
                    unitsPurchased: purchaseItem.unitsPurchased,
                });
            }

            /* Updating Inventory */
            await axios.patch(
                `${process.env.INVENTORY_SERVICE}/${process.env.RECORD_PURCHASE_PATH}`,
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
