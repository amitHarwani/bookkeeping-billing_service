import { NextFunction, Request, Response, Router } from "express";
import {
    addQuotationValidator,
    getAllQuotationsValidator,
    getQuotationValidator,
    updateQuotationValidator,
} from "../validators/quotation.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import {
    addQuotation,
    getAllQuotations,
    getQuotation,
    updateQuotation,
} from "../controllers/quotation.controllers";

const router = Router();

router.post(
    "/get-all-quotations",
    getAllQuotationsValidator(),
    validateInput,
    checkAccess(16),
    getAllQuotations
);

router.get(
    "/get-quotation",
    getQuotationValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(16, Number(req?.query?.companyId))(req, res, next);
    },
    getQuotation
);

router.post(
    "/add-quotation",
    addQuotationValidator(),
    validateInput,
    checkAccess(17),
    addQuotation
);

router.put(
    "/update-quotation",
    updateQuotationValidator(),
    validateInput,
    checkAccess(17),
    updateQuotation
);

export default router;
