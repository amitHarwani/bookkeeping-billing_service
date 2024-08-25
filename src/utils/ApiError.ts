
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public errors: Array<any>,
        public stack = ""
    ){
        super(message);
    }
}