import { NextFunction, Request, Response, Router } from "express";
import {
    addPurchaseValidator,
    getAllPurchasesValidator,
    getPurchaseValidator,
    updatePurchaseValidator,
} from "../validators/purchase.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import {
    addPurchase,
    getAllPurchases,
    getPurchase,
    updatePurchase,
} from "../controllers/purchase.controllers";

const router = Router();

router.post(
    "/get-all-purchases",
    getAllPurchasesValidator(),
    validateInput,
    checkAccess(12),
    getAllPurchases
);
router.post(
    "/add-purchase",
    addPurchaseValidator(),
    validateInput,
    checkAccess(13),
    addPurchase
);

router.get(
    "/get-purchase",
    getPurchaseValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(12, Number(req.query?.companyId))(req, res, next);
    },
    getPurchase
);

router.put(
    "/update-purchase",
    updatePurchaseValidator(),
    validateInput,
    checkAccess(13),
    updatePurchase
);

export default router;
