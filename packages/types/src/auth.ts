export interface IJwtPayload {
  sub: string; // Identity ID
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string; // Optional tying to specific session
  iat?: number;
  exp?: number;
}

export interface ILoginResponse {
  accessToken: string;
  // Refresh token should be in a cookie ideally, but can be part of DTO
  // We won't return it in JSON if it's HttpOnly cookie, but keeping the type generic
}

export interface IAuthUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
}
