import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/async_handler";
import {
    GetCashFlowSummaryRequest,
    GetCashFlowSummaryResponse,
} from "../dto/summary/get_cashflow_summary_dto";
import { db } from "../db";
import { cashInOut, purchases, saleItems, sales } from "db_service";
import { and, between, eq, sql, sum } from "drizzle-orm";
import moment from "moment";
import { DATE_TIME_FORMATS } from "../constants";
import { ApiResponse } from "../utils/ApiResponse";
import { GetTopSellersForCurrentMonthResponse } from "../dto/summary/get_topsellers_for_current_month_dto";

export const getCashFlowSummary = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetCashFlowSummaryRequest;

        /* Getting total cash in and cash out from cash in out table */
        const cashFlowRequest = db
            .select({
                totalCashIn: sum(cashInOut.cashIn),
                totalCashOut: sum(cashInOut.cashOut),
            })
            .from(cashInOut)
            .where(
                and(
                    eq(cashInOut.companyId, body.companyId),
                    between(
                        cashInOut.transactionDateTime,
                        moment.utc(body.from).toDate(),
                        moment.utc(body.to).toDate()
                    )
                )
            );

        /* Payments and collections due  */
        const paymentsDueDBRequest = db
            .select({ totalPaymentsDue: sum(purchases.amountDue) })
            .from(purchases)
            .where(
                and(
                    eq(purchases.companyId, body.companyId),
                    eq(purchases.isFullyPaid, false),
                    sql`${purchases.paymentDueDate} <= ${moment.utc(body.to).format(DATE_TIME_FORMATS.dateFormat)}`
                )
            );

        const collectionsDueDBRequest = db
            .select({ totalCollectionsDue: sum(sales.amountDue) })
            .from(sales)
            .where(
                and(
                    eq(sales.companyId, body.companyId),
                    eq(sales.isFullyPaid, false),
                    sql`${sales.paymentDueDate} <= ${moment.utc(body.to).format(DATE_TIME_FORMATS.dateFormat)}`
                )
            );

        const [cashFlow, paymentsDue, collectionsDue] = await Promise.all([
            cashFlowRequest,
            paymentsDueDBRequest,
            collectionsDueDBRequest,
        ]);

        return res.status(200).json(
            new ApiResponse<GetCashFlowSummaryResponse>(200, {
                cashIn: Number(cashFlow[0].totalCashIn),
                cashOut: Number(cashFlow[0].totalCashOut),
                collectionsDue: Number(collectionsDue[0].totalCollectionsDue),
                paymentsDue: Number(paymentsDue[0].totalPaymentsDue),
            })
        );
    }
);

export const getTopSellersForCurrentMonth = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const companyId = Number(req.params.companyId);

        /* End date is current date time in utc */
        const to = moment.utc();
        /* Start date time, is the first of this month at 00:00:00 */
        const from = to.clone();
        from.date(1);
        from.hour(0);
        from.minute(0);
        from.second(0);


        /* Getting the top selling items from saleItems table */
        const topSellersForCurrentMonth = await db
            .select({
                itemName: saleItems.itemName,
                itemId: saleItems.itemId,
                totalUnitsSold: sum(saleItems.unitsSold),
            })
            .from(saleItems)
            .where(
                and(
                    eq(saleItems.companyId, companyId),
                    between(saleItems.createdAt, from.toDate(), to.toDate())
                )
            )
            .groupBy(saleItems.itemId, saleItems.itemName)
            .orderBy(sum(saleItems.unitsSold))
            .limit(5);

        return res.status(200).json(
            new ApiResponse<GetTopSellersForCurrentMonthResponse>(200, {
                topSellingItems: topSellersForCurrentMonth,
            })
        );
    }
);
