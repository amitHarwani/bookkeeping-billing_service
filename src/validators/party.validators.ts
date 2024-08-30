import { body, param, query } from "express-validator";

export const getAllPartiesValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid companyId field"),
        body("pageSize").isInt().withMessage("invalid pageSize field"),
        body("cursor").custom((value) => {
            if (
                !value ||
                (typeof value === "object" &&
                    typeof value?.partyId === "number" &&
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
                    (typeof value?.isActive === "boolean" ||
                        typeof value?.partyNameSearchQuery === "string"))
            ) {
                return true;
            } else if (typeof value === "object") {
                return true;
            }
            throw new Error("invalid query field");
        }),
    ];
};

export const addPartyValidator = () => {
    return [
        body("companyId").isInt().withMessage("invalid companyId field"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("defaultSaleCreditAllowanceInDays")
            .isInt()
            .withMessage("invalid defaultSaleCreditAllowanceInDays field"),
        body("defaultPurchaseCreditAllowanceInDays")
            .isInt()
            .withMessage("invalid defaultPurchaseCreditAllowanceInDays field"),
        body("countryId").isInt().withMessage("invalid countryId field"),
        body("phoneNumber")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("isActive").isBoolean().withMessage("invalid isActive field"),
        body("taxDetails").custom((value) => {
            if (value === null || Array.isArray(value)) {
                return true;
            }
            throw new Error("invalid taxDetails field");
        }),
    ];
};

export const getPartyValidator = () => {
    return [
        query("partyId").isInt().withMessage("invalid party id"),
        query("companyId").isInt().withMessage("invalid company id"),
    ];
};

export const updatePartyValidator = () => {
    return [
        body("partyId").isInt().withMessage("invalid partyId field"),
        body("companyId").isInt().withMessage("invalid companyId field"),
        body("partyName")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("defaultSaleCreditAllowanceInDays")
            .isInt()
            .withMessage("invalid defaultSaleCreditAllowanceInDays field"),
        body("defaultPurchaseCreditAllowanceInDays")
            .isInt()
            .withMessage("invalid defaultPurchaseCreditAllowanceInDays field"),
        body("countryId").isInt().withMessage("invalid countryId field"),
        body("phoneNumber")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("partyName is required")
            .escape(),
        body("isActive").isBoolean().withMessage("invalid isActive field"),
        body("taxDetails").custom((value) => {
            if (value === null || Array.isArray(value)) {
                return true;
            }
            throw new Error("invalid taxDetails field");
        }),
    ]
}
