import { AuthService } from "./AuthService";

export class MockAuthService implements AuthService {

  async login(email: string, password: string): Promise<string> {
    return `mock-token-${email}`;
  }

  async verify(token: string): Promise<boolean> {
    return token.startsWith("mock-token-");
  }
}
