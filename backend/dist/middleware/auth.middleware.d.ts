import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        address: string;
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
//# sourceMappingURL=auth.middleware.d.ts.map