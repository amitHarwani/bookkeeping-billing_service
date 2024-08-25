import { TaxDetailsOfThirdPartyType } from "../../constants";
import { ThirdParty } from "../../db";

export class AddPartyRequest {
    constructor(
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

export class AddPartyResponse {
    constructor(
        public party: ThirdParty,
        public message: string
    ) {}
}
