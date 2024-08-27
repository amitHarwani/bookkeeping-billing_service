import { NextFunction, Request, Response, Router } from "express";
import {
    addPartyValidator,
    getAllPartiesValidator,
    getPartyValidator,
    updatePartyValidator,
} from "../validators/party.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import {
    addParty,
    getAllParties,
    getParty,
    updateParty,
} from "../controllers/party.controllers";

const router = Router();

router.post(
    "/get-all-parties",
    getAllPartiesValidator(),
    validateInput,
    checkAccess(10),
    getAllParties
);

router.post(
    "/add-party",
    addPartyValidator(),
    validateInput,
    checkAccess(11),
    addParty
);

router.get(
    "/get-party",
    getPartyValidator(),
    validateInput,
    (req: Request, res: Response, next: NextFunction) => {
        checkAccess(10, Number(req.query?.companyId))(req, res, next);
    },
    getParty
);

router.put(
    "/update-party",
    updatePartyValidator(),
    validateInput,
    checkAccess(11),
    updateParty
);
export default router;
