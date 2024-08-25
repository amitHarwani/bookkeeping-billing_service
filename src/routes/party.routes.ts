import { Router } from "express";
import {
    addPartyValidator,
    getAllPartiesValidator,
} from "../validators/party.validators";
import { validateInput } from "../validators";
import { checkAccess } from "../middlewares/auth.middleware";
import { addParty, getAllParties } from "../controllers/party.controllers";

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

export default router;
