import { body, query } from "express-validator";
import { REGEX } from "../constants";

export const getAllQuotationsValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid companyId field"),
        body("pageSize").isInt().withMessage("invalid pageSize field"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.quotationId === "number" &&
                    value?.updatedAt)
            ) {
                return true;
            }
            throw new Error("invalid cursor field");
        }),
        body("query").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    (typeof value?.partyId === "number" ||
                        (typeof value?.fromDate === "string" &&
                            REGEX.dateWithTime.test(value?.fromDate) &&
                            typeof value?.toDate === "string" &&
                            REGEX.dateWithTime.test(value?.toDate)) ||
                        typeof value?.quotationNumberSearchQuery === "number"))
            ) {
                return true;
            } else if (typeof value === "object") {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const addQuotationValidator = () => {
    return [
        body("createdAt").custom((value) => {
            if (typeof value === "string" && REGEX.dateWithTime.test(value)) {
                return true;
            }
            throw new Error("invalid createdAt date");
        }),
        body("quotationNumber")
            .isInt()
            .withMessage("invalid quotation number")
            .optional({ values: "null" }),
        body("companyId").isInt().withMessage("invalid company id"),
        body("partyId").isInt().withMessage("invalid party id"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("createdBy")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("invalid createdBy field")
            .escape(),
        body("subtotal").isNumeric().withMessage("invalid subtotal"),
        body("discount").isNumeric().withMessage("invalid discount"),
        body("totalAfterDiscount")
            .isNumeric()
            .withMessage("invalid total after discount"),
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

export const getQuotationValidator = () => {
    return [
        query("quotationId").isInt().withMessage("invalid quotation id"),
        query("companyId").isInt().withMessage("invalid company id"),
    ];
};

export const updateQuotationValidator = () => {
    return [
        body("quotationId").isInt().withMessage("invalid quotation id"),
        body("quotationNumber")
            .isInt()
            .withMessage("invalid quotation number")
            .optional({ values: "null" }),
        body("companyId").isInt().withMessage("invalid company id"),
        body("partyId").isInt().withMessage("invalid party id"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("createdBy")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("invalid createdBy field")
            .escape(),
        body("subtotal").isNumeric().withMessage("invalid subtotal"),
        body("discount").isNumeric().withMessage("invalid discount"),
        body("totalAfterDiscount")
            .isNumeric()
            .withMessage("invalid total after discount"),
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
        body("oldItems").isArray().withMessage("invalid old items field"),
        body("items").isArray().withMessage("invalid items field"),
    ];
};
