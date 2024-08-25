import { User } from "../../db";

export class CheckAccessResponse {
    constructor(
        public user: User,
        public isAuthorized: boolean
    ){

    }
}