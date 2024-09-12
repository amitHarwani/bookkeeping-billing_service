import { body, query } from "express-validator";
import { REGEX } from "../constants";

export const getAllSalesValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid companyId field"),
        body("pageSize").isInt().withMessage("invalid pageSize field"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.saleId === "number" &&
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
                        (typeof value?.purchaseType === "string" &&
                            (value?.purchaseType === "ALL" ||
                                value?.purchaseType === "CASH" ||
                                value?.purchaseType === "CREDIT")) ||
                        (typeof value?.fromTransactionDate === "string" &&
                            REGEX.dateWithTime.test(
                                value?.fromTransactionDate
                            ) &&
                            typeof value?.toTransactionDate === "string" &&
                            REGEX.dateWithTime.test(
                                value?.toTransactionDate
                            )) ||
                        typeof value?.getOnlyOverduePayments === "boolean" ||
                        typeof value?.invoiceNumberSearchQuery === "number"))
            ) {
                return true;
            } else if (typeof value === "object") {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const getSaleValidator = () => {
    return [
        query("saleId").isInt().withMessage("invalid sale id"),
        query("companyId").isInt().withMessage("invalid company id"),
    ];
};

export const addSaleValidator = () => {
    return [
        body("createdAt").custom((value) => {
            if (
                (typeof value === "string" && REGEX.dateWithTime.test(value))
            ) {
                return true;
            }
            throw new Error("invalid createdAt date");
        }),
        body("invoiceNumber").isInt().withMessage("invalid invoice number").optional({values: "null"}),
        body("quotationNumber").isInt().withMessage("invalid quotation number").optional({values: "null"}),
        body("companyId").isInt().withMessage("invalid company id"),
        body("partyId")
            .isInt()
            .optional({ values: "null" })
            .withMessage("invalid party id"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape()
            .optional({ values: "null" }),
        body("isNoPartyBill")
            .isBoolean()
            .withMessage("invalid is noPartyBill field"),
        body("doneBy")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("invalid doneBy field")
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
        body("isCredit").isBoolean().withMessage("invalid is credit field"),
        body("paymentDueDate").custom((value) => {
            if (
                value == null ||
                (typeof value === "string" && REGEX.dateWithTime.test(value))
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
                (typeof value === "string" && REGEX.dateWithTime.test(value))
            ) {
                return true;
            }
            throw new Error("invalid payment completion date");
        }),
        body("decimalRoundTo")
            .isInt()
            .withMessage("invalid decimal round to field"),
        body("items").isArray().withMessage("invalid items field"),
    ];
};

export const updateSaleValidator = () => {
    return [
        body("saleId").isInt().withMessage("invalid sale id"),
        body("invoiceNumber").isInt().withMessage("invalid invoice number").optional({values: "null"}),
        body("companyId").isInt().withMessage("invalid company id"),
        body("partyId")
            .isInt()
            .optional({ values: "null" })
            .withMessage("invalid party id"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape()
            .optional({ values: "null" }),
        body("isNoPartyBill")
            .isBoolean()
            .withMessage("invalid is noPartyBill field"),
        body("doneBy")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("invalid doneBy field")
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
        body("isCredit").isBoolean().withMessage("invalid is credit field"),
        body("paymentDueDate").custom((value) => {
            if (
                value == null ||
                (typeof value === "string" && REGEX.dateWithTime.test(value))
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
                (typeof value === "string" && REGEX.dateWithTime.test(value))
            ) {
                return true;
            }
            throw new Error("invalid payment completion date");
        }),
        body("decimalRoundTo")
            .isInt()
            .withMessage("invalid decimal round to field"),
        body("oldItems").isArray().withMessage("invalid oldItems field"),
        body("items").isArray().withMessage("invalid items field"),
    ];
};

