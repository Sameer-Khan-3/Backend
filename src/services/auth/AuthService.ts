export interface AuthService {
  login(email: string, password: string): Promise<string>;
  verify(token: string): Promise<boolean>;
}
