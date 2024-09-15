import { NextFunction, Request, Response, Router } from "express";
import {
    getCashFlowSummaryValidator,
    getTopSellersForCurrentMonthValidator,
} from "../validators/summary.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import {
    getCashFlowSummary,
    getTopSellersForCurrentMonth,
} from "../controllers/summary.controllers";

const router = Router();

router.post(
    "/get-cashflow-summary",
    getCashFlowSummaryValidator(),
    validateInput,
    checkAccess(18),
    getCashFlowSummary
);

router.get(
    "/get-topsellers-for-current-month/:companyId",
    getTopSellersForCurrentMonthValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(19, Number(req.params.companyId))(req, res, next);
    },
    getTopSellersForCurrentMonth
);
export default router;
