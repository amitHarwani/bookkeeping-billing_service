import { credentials } from "@grpc/grpc-js";
import { ApiError } from "../utils/ApiError";
import { AuthServiceClient, User } from "./proto/auth_service";

/* GRPC Client */
const client = new AuthServiceClient(
    process.env.AUTH_GRPC_SERVICE as string,
    credentials.createInsecure()
);

/* check access request */
export const checkAccessGRPC = (
    featureId: number,
    companyId: number | null,
    jwtToken: string
) => {
    /* Returns a promise */
    return new Promise<User | undefined>((resolve, reject) => {
        /* GRPC request to server */
        client.checkAccess(
            {
                featureId,
                companyId: companyId || -1,
                isSystemAdminRequest: companyId ? true : false,
                jwtToken,
            },
            (error, response) => {
                if (error) {
                    /* On error reject, Convert grpc error type to ApiError type */
                    const apiError = new ApiError(error.code, error.details, []);
                    return reject(apiError);
                } else {
                    return resolve(response.user)
                }
            }
        );
    });
};
