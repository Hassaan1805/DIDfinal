import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export interface AuthenticatedRequest extends Request {
    user?: {
        address: string;
        did?: string;
        employeeId?: string;
        verifierId?: string;
        verifierOrganizationId?: string;
        verifierOrganizationName?: string;
        challengeId: string;
        authenticated: boolean;
        timestamp: string;
        accessLevel?: 'standard' | 'premium';
        premiumGrantedAt?: string;
        iat?: number;
        exp?: number;
        iss?: string;
    };
}
export declare const verifyAuthToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requirePremiumAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const upgradeSessionToPremium: (userAddress: string, challengeId: string) => string;
export interface AdminJwtPayload extends jwt.JwtPayload {
    role?: string;
    badge?: string;
    permissions?: string[];
    scope?: string | string[];
    admin?: boolean;
    employeeId?: string;
    address?: string;
}
export interface AdminAuthenticatedRequest extends Request {
    adminUser?: AdminJwtPayload;
    adminAuthMethod?: 'jwt' | 'static-token';
}
export interface AdminAuthConfig {
    jwtSecret: string;
    staticTokens: Set<string>;
    requireJwtInProduction: boolean;
    allowStaticTokens: boolean;
}
export declare function getAdminAuthConfig(): AdminAuthConfig;
export declare function hasAdminClaims(decoded: AdminJwtPayload): boolean;
export declare const requireAdminAuth: (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare function generateAdminToken(payload?: Partial<AdminJwtPayload>): string;
//# sourceMappingURL=auth.middleware.d.ts.map