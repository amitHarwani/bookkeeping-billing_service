import { NextFunction, Request, Response } from "express";
import axios, { AxiosError, AxiosResponse } from "axios";
import asyncHandler from "../utils/async_handler";
import { ApiResponse } from "../utils/ApiResponse";
import { IsLoggedInResponse } from "../dto/auth/is_logged_in_dto";
import { ApiError } from "../utils/ApiError";
import { CheckAccessResponse } from "../dto/auth/check_access_dto";

export const isLoggedIn = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* Request to user service: To check if user is logged in */
        const url = `${process.env.USER_SERVICE}${process.env.IS_LOGGED_IN_PATH}`;

        const response = await axios.post<ApiResponse<IsLoggedInResponse>>(
            url,
            {},
            { headers: { Authorization: req.header("Authorization") } }
        );

        const responseData = response.data;

        /* Next route if user is logged in else throw an error */
        if (responseData.data.isLoggedIn) {
            next();
        } else {
            throw new ApiError(401, "invalid access token", []);
        }
    }
);

export const checkAccess = (featureId: number, companyId?: number | null) => {
    return asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            /* CompanyId either passed as parameter, or from request body */
            const company = req?.body?.companyId ? req.body.companyId : companyId;

            /* Request to user service, to check if user is authorized */
            const url = `${process.env.USER_SERVICE}${process.env.CHECK_ACCESS_PATH}`;

            let response;

            try {
                response = await axios.post<AxiosResponse<CheckAccessResponse>>(
                    url,
                    { featureId, companyId: company },
                    { headers: { Authorization: req.header("Authorization") } }
                );
            } catch (err) {
                const error = err as AxiosError<ApiError>;
                const errorData = error.response?.data || {statusCode: 500, message: "", errors: [], stack: ""};
                throw new ApiError(errorData.statusCode, errorData.message, errorData.errors, errorData.stack);
            }


            const responseData = response.data;

            /* Next route if user is authorized */
            if (responseData.data.isAuthorized) {
                req.user = responseData.data.user;
                next();
            } else {
                throw new ApiError(403, "unauthorized", []);
            }
        }
    );
};
