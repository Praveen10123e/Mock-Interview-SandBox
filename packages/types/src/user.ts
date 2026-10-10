import { Role } from './enums';

export interface UserBase {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserContext {
  userId: string;
  role: Role;
  permissions?: string[];
}
