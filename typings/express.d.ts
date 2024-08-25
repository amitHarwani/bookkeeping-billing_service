import { Express } from "express-serve-static-core";
import { User } from "../src/db";

declare module "express-serve-static-core" {
    interface Request {
        user?: User;
    }
}