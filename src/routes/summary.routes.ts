import { Router } from "express";
import { getCashFlowSummaryValidator } from "../validators/summary.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import { getCashFlowSummary } from "../controllers/summary.controllers";

const router = Router();

router.post(
    "/get-cashflow-summary",
    getCashFlowSummaryValidator(),
    validateInput,
    checkAccess(18),
    getCashFlowSummary
);
export default router;
