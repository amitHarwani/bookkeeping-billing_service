import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/async_handler";
import { AddPartyRequest, AddPartyResponse } from "../dto/party/add_party_dto";
import { db } from "../db";
import { thirdParties } from "db_service";
import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {
    GetAllPartiesRequest,
    GetAllPartiesResponse,
} from "../dto/party/get_all_parties_dto";
import { GetPartyResponse } from "../dto/party/get_party_dto";
import {
    UpdatePartyRequest,
    UpdatePartyResponse,
} from "../dto/party/update_party_dto";

export const getAllParties = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as GetAllPartiesRequest;

        /* Custom Query */
        let customQuery;

        /* if query is passed */
        if (body.query) {
            let isActiveQuery;
            let partyNameQuery;

            /* Querying by isActive */
            if (typeof body?.query?.isActive === "boolean") {
                isActiveQuery = eq(thirdParties.isActive, body.query.isActive);
            }
            /* Querying for similar party name */
            if (
                typeof body?.query?.partyNameSearchQuery === "string" &&
                body?.query?.partyNameSearchQuery
            ) {
                partyNameQuery = ilike(
                    thirdParties.partyName,
                    `%${body.query.partyNameSearchQuery}%`
                );
            }

            /* Combining the query */
            customQuery = and(isActiveQuery, partyNameQuery);
        }

        let whereClause;

        /* If cursor is passed: Next page is being fetched */
        if (body.cursor) {
            /* partyId should be greater than the last partyId fetched, and updatedAt must be equal to the lastUpdatedAt fetched
            or updatedAt should be less than the last updatedAt fetched, since parties are ordered by updated at.
            and filtering by companyId, and the custom query */
            whereClause = and(
                or(
                    sql`${thirdParties.updatedAt} < ${body.cursor.updatedAt}`,
                    and(
                        sql`${thirdParties.updatedAt} = ${body.cursor.updatedAt}`,
                        gt(thirdParties.partyId, body.cursor.partyId)
                    )
                ),
                eq(thirdParties.companyId, body.companyId),
                customQuery
            );
        } else {
            whereClause = customQuery;
        }

        /* DB Query */
        const allParties = await db
            .select()
            .from(thirdParties)
            .where(whereClause)
            .limit(body.pageSize)
            .orderBy(desc(thirdParties.updatedAt), asc(thirdParties.partyId));

        /* Setting the next page cursor according to the last item values */
        let nextPageCursor;
        const lastItem = allParties?.[allParties.length - 1];
        if (lastItem) {
            nextPageCursor = {
                partyId: lastItem.partyId,
                updatedAt: lastItem.updatedAt as Date,
            };
        }

        return res.status(200).json(
            new ApiResponse<GetAllPartiesResponse>(200, {
                parties: allParties,
                hasNextPage: nextPageCursor ? true : false,
                nextPageCursor: nextPageCursor,
            })
        );
    }
);
export const addParty = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as AddPartyRequest;

        /* Checking if party with the same name exists for the same company */
        const existingPartiesWithSameName = await db
            .select()
            .from(thirdParties)
            .where(
                and(
                    eq(thirdParties.companyId, body.companyId),
                    eq(
                        sql`lower(${thirdParties.partyName})`,
                        body.partyName.toLowerCase()
                    )
                )
            );

        /* Duplicate parties error */
        if (existingPartiesWithSameName.length) {
            throw new ApiError(409, "party with same name already exists", []);
        }

        /* Adding party to DB */
        const partyAdded = await db
            .insert(thirdParties)
            .values({
                companyId: body.companyId,
                countryId: body.countryId,
                defaultPurchaseCreditAllowanceInDays:
                    body.defaultPurchaseCreditAllowanceInDays,
                defaultSaleCreditAllowanceInDays:
                    body.defaultSaleCreditAllowanceInDays,
                partyName: body.partyName,
                phoneNumber: body.phoneNumber,
                taxDetails: body.taxDetails,
                isActive: body.isActive,
            })
            .returning();

        return res.status(201).json(
            new ApiResponse<AddPartyResponse>(201, {
                party: partyAdded[0],
                message: "party added successfully",
            })
        );
    }
);

export const getParty = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        /* party id and company id from request query  */
        const partyId = Number(req.query.partyId);
        const companyId = Number(req.query.companyId);

        /* Finding the party from DB */
        const partyFound = await db
            .select()
            .from(thirdParties)
            .where(
                and(
                    eq(thirdParties.partyId, partyId),
                    eq(thirdParties.companyId, companyId)
                )
            );

        /* Party not found */
        if (!partyFound.length) {
            throw new ApiError(404, "party not found", []);
        }

        return res.status(200).json(
            new ApiResponse<GetPartyResponse>(200, {
                party: partyFound[0],
            })
        );
    }
);

export const updateParty = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as UpdatePartyRequest;

        /* Checking if party with duplicate name already exists */

        const isPartyExists = await db
            .select()
            .from(thirdParties)
            .where(
                and(
                    eq(
                        sql`lower(${thirdParties.partyName})`,
                        body.partyName.toLowerCase()
                    ),
                    eq(thirdParties.companyId, body.companyId)
                )
            );

        /* Throw error if party with the same name but different partyId already exists */
        if (isPartyExists.length && isPartyExists[0].partyId != body.partyId) {
            throw new ApiError(
                409,
                "party with the same name already exists",
                []
            );
        }

        /* Updating party in DB */
        const partyUpdated = await db
            .update(thirdParties)
            .set({
                companyId: body.companyId,
                countryId: body.countryId,
                defaultPurchaseCreditAllowanceInDays:
                    body.defaultPurchaseCreditAllowanceInDays,
                defaultSaleCreditAllowanceInDays:
                    body.defaultSaleCreditAllowanceInDays,
                isActive: body.isActive,
                partyName: body.partyName,
                phoneNumber: body.phoneNumber,
                taxDetails: body.taxDetails,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(thirdParties.partyId, body.partyId),
                    eq(thirdParties.companyId, body.companyId)
                )
            )
            .returning();

        return res.status(200).json(
            new ApiResponse<UpdatePartyResponse>(200, {
                party: partyUpdated[0],
                message: "party uodated successfully",
            })
        );
    }
);
