import { TaxDetailsOfThirdPartyType } from "../../constants";
import { ThirdParty } from "../../db";

export class UpdatePartyRequest {
    constructor(
        public partyId: number,
        public companyId: number,

        public partyName: string,
        public defaultSaleCreditAllowanceInDays: number,
        public defaultPurchaseCreditAllowanceInDays: number,
        public countryId: number,
        public phoneNumber: string,
        public isActive: boolean,
        public taxDetails: Array<TaxDetailsOfThirdPartyType> | null
    ) {}
}

export class UpdatePartyResponse {
    constructor(
        public party: ThirdParty,
        public message: string
    ) {}
}
