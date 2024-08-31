import { Router } from "express";
import {
    addPurchaseValidator,
    getAllPurchasesValidator,
} from "../validators/purchase.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import {
    addPurchase,
    getAllPurchases,
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

export default router;
