import { Request, Response, NextFunction } from 'express';
export interface AnonymousAuthRequest extends Request {
    anonymousAuth?: {
        accessLevel: string;
        grantType: string;
        verified: boolean;
        issuedAt: number;
        expiresAt: number;
    };
}
export declare const verifyAnonymousToken: (req: AnonymousAuthRequest, res: Response, next: NextFunction) => void;
export declare const requireCorporateExcellenceNFT: (req: AnonymousAuthRequest, res: Response, next: NextFunction) => void;
declare const _default: {
    verifyAnonymousToken: (req: AnonymousAuthRequest, res: Response, next: NextFunction) => void;
    requireCorporateExcellenceNFT: (req: AnonymousAuthRequest, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=zkp.middleware.d.ts.map