import { body } from "express-validator"
import { REGEX } from "../constants"


export const getCashFlowSummaryValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid company id"),
        body("from").custom((value) => {
            if(typeof value === "string" && REGEX.dateWithTime.test(value)){
                return true;
            }
            throw new Error("invalid from date time passed");
        }),
        body("to").custom((value) => {
            if(typeof value === "string" && REGEX.dateWithTime.test(value)){
                return true;
            }
            throw new Error("invalid to date time passed");
        })
    ]
}