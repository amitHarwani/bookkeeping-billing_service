import { Router } from "express";
import { addPurchaseValidator } from "../validators/purchase.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import { addPurchase } from "../controllers/purchase.controllers";

const router = Router();

router.post(
    "/add-purchase",
    addPurchaseValidator(),
    validateInput,
    checkAccess(13),
    addPurchase
);

export default router;
