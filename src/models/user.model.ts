export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

export const users: User[] = [];
