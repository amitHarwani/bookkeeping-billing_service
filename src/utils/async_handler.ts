import { Request, Response, NextFunction } from "express";

const asyncHandler = (
    request: (req: Request, res: Response, next: NextFunction) => Promise<Response> | Promise<void>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(request(req, res, next)).catch((err) => next(err));
    };
};

export default asyncHandler;