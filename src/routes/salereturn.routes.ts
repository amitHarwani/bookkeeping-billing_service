import { Router, Request, Response, NextFunction } from "express";
import {
    addSaleReturnValidator,
    getAllSaleReturnsValidator,
    getSaleReturnValidator,
} from "../validators/salereturn.validators";
import { validateInput } from "../validators";
import { checkAccess, isLoggedIn } from "../middlewares/auth.middleware";
import {
    addSaleReturn,
    getAllSaleReturns,
    getSaleReturn,
} from "../controllers/salereturn.controllers";

const router = Router();

router.post(
    "/get-all-sale-returns",
    getAllSaleReturnsValidator(),
    validateInput,
    checkAccess(29),
    getAllSaleReturns
);

router.get(
    "/get-sale-return",
    getSaleReturnValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(29, Number(req?.query?.companyId))(req, res, next);
    },
    getSaleReturn
);

router.post(
    "/add-sale-return",
    addSaleReturnValidator(),
    validateInput,
    checkAccess(30),
    addSaleReturn
);

export default router;
