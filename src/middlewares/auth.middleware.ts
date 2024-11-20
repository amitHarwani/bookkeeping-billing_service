import { NextFunction, Request, Response } from "express";
import { checkAccessGRPC } from "../grpc/auth_service_client";
import { ApiError } from "../utils/ApiError";
import asyncHandler from "../utils/async_handler";

export const checkAccess = (featureId: number, companyId?: number | null) => {
    return asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
             /* CompanyId either passed as parameter, or from request body */
           const company = req?.body?.companyId ? req.body.companyId : companyId;

           try {
               /* GRPC Request to check access */
               const token = req.header("Authorization")?.replace("Bearer ", "");
               const user = await checkAccessGRPC(featureId, company, token || "");

               if(user){
                   req.user = {...user, password: "", createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt)};
                   next();
               }
               else{
                   throw new ApiError(403, "unauthorized", []);
               }
           } catch (err) {
               const error = err as ApiError;
               throw new ApiError(error?.statusCode || 500, error?.message || "", []);
           }
        }
    );
};
