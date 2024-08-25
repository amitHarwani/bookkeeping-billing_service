import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError";

export const validateInput = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    } else {
        const errorList: Array<{[key: string]: string}> = [{}];
        errors.array().map((error) => {
            if (error.type === "field") {
                errorList[0] = { ...errorList[0], [error.path]: error.msg };
            }
        });

        throw new ApiError(422, "invalid data", errorList);
    }
};
