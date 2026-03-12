export interface IAuthService {
    signUp(email: string, password: string, role: string, username: string): Promise<any>;
    signIn(email: string, password: string): Promise<any>;
}