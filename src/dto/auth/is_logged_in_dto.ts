import { User } from "../../db";

export class IsLoggedInResponse {
    constructor(
        public user: User,
        public isLoggedIn: boolean
    ){

    }
}