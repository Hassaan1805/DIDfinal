import Joi from 'joi';
export declare const authSchemas: {
    challenge: Joi.ObjectSchema<any>;
    verify: Joi.ObjectSchema<any>;
    sepoliaVerify: Joi.ObjectSchema<any>;
};
export declare const adminSchemas: {
    createEmployee: Joi.ObjectSchema<any>;
    updateEmployee: Joi.ObjectSchema<any>;
    assignBadge: Joi.ObjectSchema<any>;
    issueCredential: Joi.ObjectSchema<any>;
};
export declare const didSchemas: {
    resolve: Joi.ObjectSchema<any>;
    register: Joi.ObjectSchema<any>;
};
export declare const identitySchemas: {
    createProfile: Joi.ObjectSchema<any>;
    updateProfile: Joi.ObjectSchema<any>;
};
export declare function validateBody(schema: Joi.ObjectSchema): (req: any, res: any, next: any) => any;
export declare function validateParams(schema: Joi.ObjectSchema): (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.middleware.d.ts.map