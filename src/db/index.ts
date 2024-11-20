import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from 'db_service';
import { InferSelectModel } from 'drizzle-orm';
import fs from "fs";

/* DB Url from Enviornment variable or file */
const DB_URL = (process.env.DB_URL || fs.readFileSync(process.env.DB_URL_FILE as string, 'utf-8'))

/* DB Client */
const queryClient = postgres(DB_URL);

export const db = drizzle(queryClient, {schema, logger: true});

export type User = InferSelectModel<typeof schema.users>;
export type ThirdParty = InferSelectModel<typeof schema.thirdParties>;
export type Purchase = InferSelectModel<typeof schema.purchases>;
export type PurchaseItem = InferSelectModel<typeof schema.purchaseItems>
export type Sale = InferSelectModel<typeof schema.sales>;
export type SaleItem = InferSelectModel<typeof schema.saleItems>;
export type Quotation = InferSelectModel<typeof schema.quotations>;
export type QuotationItem = InferSelectModel<typeof schema.quotationItems>;
export type SaleReturn = InferSelectModel<typeof schema.saleReturns>
export type SaleReturnItem = InferSelectModel<typeof schema.saleReturnItems>;
export type PurchaseReturn = InferSelectModel<typeof schema.purchaseReturns>;
export type PurchaseReturnItem = InferSelectModel<typeof schema.purchaseReturnItems>;