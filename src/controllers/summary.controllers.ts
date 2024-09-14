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

export const getCashFlowSummary = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetCashFlowSummaryRequest;

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
