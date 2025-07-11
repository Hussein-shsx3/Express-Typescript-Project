export type UserRole = "user" | "admin";

export interface IUser {
  name: string;
  email: string;
  password: string;
  picture?: string;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}
