import { body } from "express-validator";
import { REGEX } from "../constants";

export const addPurchaseValidator = () => {
    return [
        body("invoiceNumber").isInt().withMessage("invalid invoice number"),
        body("companyId").isInt().withMessage("invalid company id"),
        body("partyId").isInt().withMessage("invalid party id"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("subtotal").isNumeric().withMessage("invalid subtotal"),
        body("discout").isNumeric().withMessage("invalid discount"),
        body("totalAfterDiscount")
            .isNumeric()
            .withMessage("invalid total after discount"),
        body("taxPercent").isNumeric().withMessage("invalid tax percentage"),
        body("taxName")
            .isString()
            .trim()
            .withMessage("invalid tax name")
            .escape(),
        body("totalAfterTax")
            .isNumeric()
            .withMessage("invalid total after tax"),
        body("isCredit").isBoolean().withMessage("invalid is credit field"),
        body("paymentDueDate").custom((value) => {
            if (
                value == null ||
                (typeof value === "string" && REGEX.date.test(value))
            ) {
                return true;
            }
            throw new Error("invalid payment due date time");
        }),
        body("amountPaid").isNumeric().withMessage("invalid amount paid"),
        body("amountDue").isNumeric().withMessage("invalid amount due"),
        body("isFullyPaid")
            .isBoolean()
            .withMessage("invalid is fully paid field"),
        body("paymentCompletionDate").custom((value) => {
            if (
                value == null ||
                (typeof value === "string" && REGEX.date.test(value))
            ) {
                return true;
            }
            throw new Error("invalid payment completion date");
        }),
        body("receiptNumber").custom((value) => {
            if (value == null || typeof value === "string") {
                return true;
            }
            throw new Error("invalid receipt number");
        }),
        body("items").isArray().withMessage("invalid items field"),
    ];
};
