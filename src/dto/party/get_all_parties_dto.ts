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
        },
        public select?: [keyof ThirdParty]
    ) {}
}

export class GetAllPartiesResponse<T> {
    constructor(
        public parties: T,
        public hasNextPage: boolean,
        public nextPageCursor?: {
            partyId: number;
            updatedAt: Date;
        }
    ) {}
}
