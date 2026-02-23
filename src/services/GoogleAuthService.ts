import { IAuthService } from "../interfaces/IAuthService";

export class GoogleAuthService implements IAuthService{
    async signUp(email: string, password: string, role: string, username: string): Promise<any> {
        throw new Error("Google sign-up not implemented yet");
    }

    async signIn(email:string, password: string){
        throw new Error("Google sign-in not implemented yet");
    }
}