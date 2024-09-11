import express, { NextFunction, Request, Response } from "express";
import { PostgresError } from "postgres";
import { ApiError } from "./utils/ApiError";

const app = express();

/* Logging */
import logger from "./utils/logger";
import morgan from "morgan";

const morganFormat = ":method :url :status :response-time ms";

app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const logObject = {
                    method: message.split(" ")[0],
                    url: message.split(" ")[1],
                    status: message.split(" ")[2],
                    responseTime: message.split(" ")[3],
                };
                logger.info(JSON.stringify(logObject));
            },
        },
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Routes */
import PartyRouter from "./routes/party.routes";
import PurchaseRouter from "./routes/purchase.routes";
import SaleRouter from "./routes/sale.routes";
import QuotationRouter from "./routes/quotation.routes";

app.use("/party",PartyRouter);
app.use("/purchase", PurchaseRouter);
app.use("/sale", SaleRouter);
app.use("/quotation", QuotationRouter);


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof PostgresError) {
        return res.status(500).json({
            stausCode: 500,
            message: err.detail,
            isDBError: true,
            stack: err.stack,
        });
    } else {
        const apiError = err as ApiError;
        return res.status(apiError.statusCode || 500).json({
            statusCode: apiError.statusCode,
            message: apiError.message,
            errors: apiError.errors,
            stack: apiError.stack,
        });
    }
});

export default app;
