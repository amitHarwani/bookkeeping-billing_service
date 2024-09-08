import { NextFunction, Request, Response, Router } from "express";
import {
    addSaleValidator,
    getAllSalesValidator,
    getSaleValidator,
} from "../validators/sale.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import { addSale, getAllSales, getSale } from "../controllers/sale.controllers";

const router = Router();

router.post(
    "/get-all-sales",
    getAllSalesValidator(),
    validateInput,
    checkAccess(14),
    getAllSales
);

router.get(
    "/get-sale",
    getSaleValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(14, Number(req?.query?.companyId))(req, res, next);
    },
    getSale
);

router.post("/add-sale", addSaleValidator(), validateInput, checkAccess(15), addSale)


export default router;
