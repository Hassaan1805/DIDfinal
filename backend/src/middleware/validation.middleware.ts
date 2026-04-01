import Joi from 'joi';

/**
 * Validation schemas for auth endpoints
 */
export const authSchemas = {
  challenge: Joi.object({
    employeeId: Joi.string().optional(),
    companyId: Joi.string().optional(),
    requestType: Joi.string().valid('authentication', 'credential-issuance', 'data-access', 'portal_access', 'general_auth').optional(),
    verifierId: Joi.string().optional(),
  }),

  verify: Joi.object({
    challengeId: Joi.string().required(),
    signature: Joi.string().required(),
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    message: Joi.string().required(),
    employeeId: Joi.string().optional(),
    did: Joi.string().optional(),
    credential: Joi.object().optional(),
    verifierId: Joi.string().optional(),
    disclosedClaims: Joi.object().optional(),
    disclosedClaimsProof: Joi.object().optional(),
  }),

  sepoliaVerify: Joi.object({
    challengeId: Joi.string().required(),
    signature: Joi.string().required(),
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    message: Joi.string().required(),
    storeOnChain: Joi.boolean().optional(),
  }),
};

/**
 * Validation schemas for admin endpoints
 */
export const adminSchemas = {
  createEmployee: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    did: Joi.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
    badge: Joi.string().valid('admin', 'manager', 'employee', 'auditor').required(),
    department: Joi.string().optional(),
  }),

  updateEmployee: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    badge: Joi.string().valid('admin', 'manager', 'employee', 'auditor').optional(),
    department: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),

  assignBadge: Joi.object({
    badge: Joi.string().valid('admin', 'manager', 'employee', 'auditor').required(),
  }),

  issueCredential: Joi.object({
    employeeId: Joi.string().required(),
    type: Joi.string().required(),
    claims: Joi.object().required(),
    expiresIn: Joi.number().integer().min(1).optional(),
  }),
};

/**
 * Validation schemas for DID endpoints
 */
export const didSchemas = {
  resolve: Joi.object({
    did: Joi.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
  }),

  register: Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
    publicKey: Joi.string().required(),
    did: Joi.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).optional(),
  }),
};

/**
 * Validation schemas for identity profile endpoints
 */
export const identitySchemas = {
  createProfile: Joi.object({
    did: Joi.string().pattern(/^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/).required(),
    publicProfile: Joi.object({
      displayName: Joi.string().max(100).optional(),
      bio: Joi.string().max(500).optional(),
      avatar: Joi.string().uri().optional(),
      publicAttributes: Joi.array().items(Joi.string()).optional(),
    }).required(),
    privateProfile: Joi.object({
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      address: Joi.string().optional(),
      privateAttributes: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }),

  updateProfile: Joi.object({
    publicProfile: Joi.object({
      displayName: Joi.string().max(100).optional(),
      bio: Joi.string().max(500).optional(),
      avatar: Joi.string().uri().optional(),
      publicAttributes: Joi.array().items(Joi.string()).optional(),
    }).optional(),
    privateProfile: Joi.object({
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      dateOfBirth: Joi.date().optional(),
      address: Joi.string().optional(),
      privateAttributes: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }),
};

/**
 * Middleware to validate request body against a Joi schema
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Middleware to validate request params against a Joi schema
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail: any) => ({
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
