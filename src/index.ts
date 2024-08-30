import dotenv from "dotenv";
dotenv.config();
dotenv.config({
    path: `.env.${process.env.NODE_ENV}`,
});

import app from "./app";
import logger from "./utils/logger";


app.listen(process.env.PORT, () => {
    logger.info(`Billing Service Listening On Port ${process.env.PORT}`);
});
