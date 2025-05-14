export { }

export interface User {
    id: string;
    name: string;
    email: string;
    googleToken: string;
    role:string
}

declare global {
    namespace Express {
        export interface Request {
            user?: User;
        }
    }
}