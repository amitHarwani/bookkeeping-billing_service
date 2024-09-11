import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from 'db_service';
import { InferSelectModel } from 'drizzle-orm';

/* DB Client */
const queryClient = postgres(process.env.DB_URL as string);

export const db = drizzle(queryClient, {schema, logger: true});

export type User = InferSelectModel<typeof schema.users>;
export type ThirdParty = InferSelectModel<typeof schema.thirdParties>;
export type Purchase = InferSelectModel<typeof schema.purchases>;
export type PurchaseItem = InferSelectModel<typeof schema.purchaseItems>
export type Sale = InferSelectModel<typeof schema.sales>;
export type SaleItem = InferSelectModel<typeof schema.saleItems>;
export type Quotation = InferSelectModel<typeof schema.quotations>;
export type QuotationItem = InferSelectModel<typeof schema.quotationItems>;