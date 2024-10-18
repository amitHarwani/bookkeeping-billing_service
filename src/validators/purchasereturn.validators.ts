import { body, query } from "express-validator";
import { REGEX } from "../constants";

export const getAllPurchaseReturnsValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid company id"),
        body("pageSize").isInt().withMessage("invalid page size"),
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    ((typeof value?.fromDate === "string" &&
                        REGEX.dateWithTime.test(value?.fromDate) &&
                        typeof value?.toDate === "string" &&
                        REGEX.dateWithTime.test(value?.toDate)) ||
                        typeof value?.purchaseReturnNumber === "number"))
            ) {
                return true;
            } else if (typeof value === "object") {
                return true;
            }
            throw new Error("invalid query field");
        }),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.purchaseReturnId === "number" &&
                    value?.createdAt)
            ) {
                return true;
            }
            throw new Error("invalid cursor field");
        }),
    ];
};

export const getPurchaseReturnValidator = () => {
    return [
        query("companyId").isInt().withMessage("invalid company id"),
        query("purchaseReturnId").isInt().withMessage("invalid purchase return id"),
    ];
};
export const addPurchaseReturnValidator = () => {
    return [
        body("createdAt").custom((value) => {
            if (typeof value === "string" && REGEX.dateWithTime.test(value)) {
                return true;
            }
            throw new Error("invalid createdAt date");
        }),
        body("purchaseReturnNumber")
            .isInt()
            .withMessage("invalid purchase return number")
            .optional({ values: "null" }),
        body("purchaseId").isInt().withMessage("invalid purchase id"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("subtotal").isNumeric().withMessage("invalid subtotal"),
        body("tax").isNumeric().withMessage("invalid total after tax"),
        body("taxPercent").isNumeric().withMessage("invalid tax percentage"),
        body("taxName")
            .isString()
            .trim()
            .withMessage("invalid tax name")
            .escape(),
        body("totalAfterTax")
            .isNumeric()
            .withMessage("invalid total after tax"),
        body("decimalRoundTo")
            .isInt()
            .withMessage("invalid decimal round to field"),
        body("items").isArray().withMessage("invalid items field"),
    ];
};

export const getPurchaseReturnsOfPurchaseValidator = () => {
    return [
        query("purchaseId").isInt().withMessage("invalid purchase id"),
        query("companyId").isInt().withMessage("invalid company id")
    ]
}