import { ThirdParty } from "../../db";

export class GetAllPartiesRequest {
    constructor(
        public companyId: number,
        public pageSize: number,
        public query?: {
            isActive?: boolean;
            partyNameSearchQuery?: boolean;
        },
        public cursor?: {
            partyId: number;
            updatedAt: Date;
        }
    ) {}
}

export class GetAllPartiesResponse {
    constructor(
        public parties: ThirdParty[],
        public hasNextPage: boolean,
        public nextPageCursor?: {
            partyId: number;
            updatedAt: Date;
        }
    ) {}
}
