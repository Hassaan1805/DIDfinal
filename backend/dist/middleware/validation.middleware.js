"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identitySchemas = exports.didSchemas = exports.adminSchemas = exports.authSchemas = void 0;
exports.validateBody = validateBody;
exports.validateParams = validateParams;
const joi_1 = __importDefault(require("joi"));
exports.authSchemas = {
    challenge: joi_1.default.object({
        employeeId: joi_1.default.string().optional(),
        companyId: joi_1.default.string().optional(),
        requestType: joi_1.default.string().valid('authentication', 'credential-issuance', 'data-access', 'portal_access', 'general_auth').optional(),
        verifierId: joi_1.default.string().optional(),
    }),
    verify: joi_1.default.object({
        challengeId: joi_1.default.string().required(),
        signature: joi_1.default.string().required(),
        address: joi_1.default.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
        message: joi_1.default.string().required(),
        employeeId: joi_1.default.string().optional(),
        did: joi_1.default.string().optional(),
        credential: joi_1.default.object().optional(),
        verifierId: joi_1.default.string().optional(),
        disclosedClaims: joi_1.default.object().optional(),
        disclosedClaimsProof: joi_1.default.object().optional(),
    }),
    sepoliaVerify: joi_1.default.object({
        challengeId: joi_1.default.string().required(),
        signature: joi_1.default.string().required(),
        address: joi_1.default.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
        message: joi_1.default.string().required(),
        storeOnChain: joi_1.default.boolean().optional(),
    }),
};
exports.adminSchemas = {
    createEmployee: joi_1.default.object({
        name: joi_1.default.string().required().min(2).max(100),
        email: joi_1.default.string().email().required(),
        address: joi_1.default.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
        did: joi_1.default.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
        badge: joi_1.default.string().valid('admin', 'manager', 'employee', 'auditor').required(),
        department: joi_1.default.string().optional(),
    }),
    updateEmployee: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).optional(),
        email: joi_1.default.string().email().optional(),
        badge: joi_1.default.string().valid('admin', 'manager', 'employee', 'auditor').optional(),
        department: joi_1.default.string().optional(),
        isActive: joi_1.default.boolean().optional(),
    }),
    assignBadge: joi_1.default.object({
        badge: joi_1.default.string().valid('admin', 'manager', 'employee', 'auditor').required(),
    }),
    issueCredential: joi_1.default.object({
        employeeId: joi_1.default.string().required(),
        type: joi_1.default.string().required(),
        claims: joi_1.default.object().required(),
        expiresIn: joi_1.default.number().integer().min(1).optional(),
    }),
};
exports.didSchemas = {
    resolve: joi_1.default.object({
        did: joi_1.default.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
    }),
    register: joi_1.default.object({
        address: joi_1.default.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
        publicKey: joi_1.default.string().required(),
        did: joi_1.default.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).optional(),
    }),
};
exports.identitySchemas = {
    createProfile: joi_1.default.object({
        did: joi_1.default.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
        publicProfile: joi_1.default.object({
            displayName: joi_1.default.string().max(100).optional(),
            bio: joi_1.default.string().max(500).optional(),
            avatar: joi_1.default.string().uri().optional(),
            publicAttributes: joi_1.default.array().items(joi_1.default.string()).optional(),
        }).required(),
        privateProfile: joi_1.default.object({
            email: joi_1.default.string().email().optional(),
            phone: joi_1.default.string().optional(),
            dateOfBirth: joi_1.default.date().optional(),
            address: joi_1.default.string().optional(),
            privateAttributes: joi_1.default.array().items(joi_1.default.string()).optional(),
        }).optional(),
    }),
    updateProfile: joi_1.default.object({
        publicProfile: joi_1.default.object({
            displayName: joi_1.default.string().max(100).optional(),
            bio: joi_1.default.string().max(500).optional(),
            avatar: joi_1.default.string().uri().optional(),
            publicAttributes: joi_1.default.array().items(joi_1.default.string()).optional(),
        }).optional(),
        privateProfile: joi_1.default.object({
            email: joi_1.default.string().email().optional(),
            phone: joi_1.default.string().optional(),
            dateOfBirth: joi_1.default.date().optional(),
            address: joi_1.default.string().optional(),
            privateAttributes: joi_1.default.array().items(joi_1.default.string()).optional(),
        }).optional(),
    }),
};
function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map((detail) => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
                timestamp: new Date().toISOString(),
            });
        }
        req.body = value;
        next();
    };
}
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
        });
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map((detail) => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
                timestamp: new Date().toISOString(),
            });
        }
        req.params = value;
        next();
    };
}
//# sourceMappingURL=validation.middleware.js.map