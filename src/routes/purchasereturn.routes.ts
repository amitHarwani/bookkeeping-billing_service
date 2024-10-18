import { NextFunction, Request, Response, Router } from "express";
import { addPurchaseReturnValidator, getAllPurchaseReturnsValidator, getPurchaseReturnsOfPurchaseValidator, getPurchaseReturnValidator } from "../validators/purchasereturn.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import { addPurchaseReturn, getAllPurchaseReturns, getPurchaseReturn, getPurchaseReturnsOfPurchase } from "../controllers/purchasereturn.controllers";

const router = Router();

router.post(
    "/get-all-purchase-returns",
    getAllPurchaseReturnsValidator(),
    validateInput,
    checkAccess(31),
    getAllPurchaseReturns
);

router.get(
    "/get-purchase-return",
    getPurchaseReturnValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(31, Number(req?.query?.companyId))(req, res, next);
    },
    getPurchaseReturn
);

router.post(
    "/add-purchase-return",
    addPurchaseReturnValidator(),
    validateInput,
    checkAccess(32),
    addPurchaseReturn
);

router.get(
    "/get-purchase-returns-of-purchase",
    getPurchaseReturnsOfPurchaseValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(31, Number(req?.query?.companyId))(req, res, next);
    },
    getPurchaseReturnsOfPurchase
);


export default router;
