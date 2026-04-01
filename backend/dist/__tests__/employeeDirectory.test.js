"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const employeeDirectory_1 = require("../services/employeeDirectory");
describe('Employee Directory Service', () => {
    describe('Validation helpers', () => {
        test('isValidDID should accept valid DID format', () => {
            expect((0, employeeDirectory_1.isValidDID)('did:ethr:0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
        });
        test('isValidDID should reject invalid formats', () => {
            expect((0, employeeDirectory_1.isValidDID)('invalid')).toBe(false);
            expect((0, employeeDirectory_1.isValidDID)('did:ethr:0x123')).toBe(false);
            expect((0, employeeDirectory_1.isValidDID)('did:other:0x1234567890abcdef1234567890abcdef12345678')).toBe(false);
            expect((0, employeeDirectory_1.isValidDID)('')).toBe(false);
        });
        test('isValidEthereumAddress should accept valid addresses', () => {
            expect((0, employeeDirectory_1.isValidEthereumAddress)('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
            expect((0, employeeDirectory_1.isValidEthereumAddress)('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
        });
        test('isValidEthereumAddress should reject invalid addresses', () => {
            expect((0, employeeDirectory_1.isValidEthereumAddress)('0x123')).toBe(false);
            expect((0, employeeDirectory_1.isValidEthereumAddress)('invalid')).toBe(false);
            expect((0, employeeDirectory_1.isValidEthereumAddress)('')).toBe(false);
        });
    });
    describe('Badge definitions', () => {
        test('should have all four badge types defined', () => {
            expect(employeeDirectory_1.BADGE_DEFINITIONS.employee).toBeDefined();
            expect(employeeDirectory_1.BADGE_DEFINITIONS.manager).toBeDefined();
            expect(employeeDirectory_1.BADGE_DEFINITIONS.admin).toBeDefined();
            expect(employeeDirectory_1.BADGE_DEFINITIONS.auditor).toBeDefined();
        });
        test('each badge should have required fields', () => {
            for (const badge of Object.values(employeeDirectory_1.BADGE_DEFINITIONS)) {
                expect(badge.badge).toBeDefined();
                expect(badge.label).toBeDefined();
                expect(badge.challengeScope).toBeDefined();
                expect(badge.permissions).toBeInstanceOf(Array);
                expect(badge.permissions.length).toBeGreaterThan(0);
            }
        });
        test('admin badge should have the most permissions', () => {
            expect(employeeDirectory_1.BADGE_DEFINITIONS.admin.permissions.length).toBeGreaterThan(employeeDirectory_1.BADGE_DEFINITIONS.employee.permissions.length);
        });
    });
    describe('listEmployees', () => {
        test('should return an array of employees with hashId', () => {
            const employees = (0, employeeDirectory_1.listEmployees)();
            expect(employees).toBeInstanceOf(Array);
            if (employees.length > 0) {
                expect(employees[0].hashId).toBeDefined();
                expect(employees[0].id).toBeDefined();
                expect(employees[0].name).toBeDefined();
            }
        });
    });
    describe('createEmployee', () => {
        const uniqueAddr = '0xUNIQUE567890abcdef1234567890abcdef123456';
        const validInput = {
            id: 'EMP-TEST-001',
            name: 'Test Employee',
            department: 'Engineering',
            email: 'test-unique-create@company.com',
            address: '0xaa11bb22cc33dd44ee55ff6677889900aabbccdd',
        };
        test('should create a new employee with defaults', () => {
            const employee = (0, employeeDirectory_1.createEmployee)(validInput);
            expect(employee.id).toBe('EMP-TEST-001');
            expect(employee.name).toBe('Test Employee');
            expect(employee.department).toBe('Engineering');
            expect(employee.badge).toBe('employee');
            expect(employee.active).toBe(true);
            expect(employee.hashId).toBeDefined();
            expect(employee.did).toMatch(/^did:ethr:/);
        });
        test('should reject duplicate employee ID', () => {
            expect(() => (0, employeeDirectory_1.createEmployee)(validInput)).toThrow('already exists');
        });
        test('should reject invalid Ethereum address', () => {
            expect(() => (0, employeeDirectory_1.createEmployee)({
                ...validInput,
                id: 'EMP-BAD-ADDR',
                email: 'bad-addr@company.com',
                address: 'not-an-address',
            })).toThrow('Invalid Ethereum address');
        });
        test('should reject empty name', () => {
            expect(() => (0, employeeDirectory_1.createEmployee)({
                ...validInput,
                id: 'EMP-NO-NAME',
                name: '',
                email: 'no-name@company.com',
                address: '0xbbccddee11223344556677889900aabbccddeeff',
            })).toThrow('name is required');
        });
        test('should reject invalid email', () => {
            expect(() => (0, employeeDirectory_1.createEmployee)({
                ...validInput,
                id: 'EMP-BAD-EMAIL',
                email: 'invalid-email',
                address: '0xccddeeFF11223344556677889900aabbccddeeff',
            })).toThrow('Valid email is required');
        });
        test('should create employee with custom badge', () => {
            const emp = (0, employeeDirectory_1.createEmployee)({
                id: 'EMP-ADMIN-TEST',
                name: 'Admin Test',
                department: 'IT',
                email: 'admin-test-badge@company.com',
                address: '0xddee11223344556677889900aabbccddeeff0011',
                badge: 'admin',
            });
            expect(emp.badge).toBe('admin');
            expect(emp.permissions).toEqual(employeeDirectory_1.BADGE_DEFINITIONS.admin.permissions);
        });
    });
    describe('getEmployeeById', () => {
        test('should find employee by ID (case-insensitive)', () => {
            const emp = (0, employeeDirectory_1.getEmployeeById)('EMP-TEST-001');
            expect(emp).toBeDefined();
            expect(emp.id).toBe('EMP-TEST-001');
        });
        test('should return undefined for non-existent ID', () => {
            expect((0, employeeDirectory_1.getEmployeeById)('NONEXISTENT')).toBeUndefined();
        });
    });
    describe('getEmployeeByAddress', () => {
        test('should find employee by address (case-insensitive)', () => {
            const emp = (0, employeeDirectory_1.getEmployeeByAddress)('0xaa11bb22cc33dd44ee55ff6677889900aabbccdd');
            expect(emp).toBeDefined();
        });
        test('should return undefined for unknown address', () => {
            expect((0, employeeDirectory_1.getEmployeeByAddress)('0x0000000000000000000000000000000000000000')).toBeUndefined();
        });
    });
    describe('assignBadge', () => {
        test('should assign a new badge and update permissions', () => {
            const updated = (0, employeeDirectory_1.assignBadge)('EMP-TEST-001', 'manager');
            expect(updated.badge).toBe('manager');
            expect(updated.permissions).toEqual(employeeDirectory_1.BADGE_DEFINITIONS.manager.permissions);
        });
        test('should throw for non-existent employee', () => {
            expect(() => (0, employeeDirectory_1.assignBadge)('FAKE', 'admin')).toThrow('Employee not found');
        });
        test('should throw for invalid badge', () => {
            expect(() => (0, employeeDirectory_1.assignBadge)('EMP-TEST-001', 'superadmin')).toThrow('Invalid badge');
        });
    });
    describe('updateEmployee', () => {
        test('should update name', () => {
            const updated = (0, employeeDirectory_1.updateEmployee)('EMP-TEST-001', { name: 'Updated Name' });
            expect(updated.name).toBe('Updated Name');
        });
        test('should update department', () => {
            const updated = (0, employeeDirectory_1.updateEmployee)('EMP-TEST-001', { department: 'Product' });
            expect(updated.department).toBe('Product');
        });
        test('should reject empty name', () => {
            expect(() => (0, employeeDirectory_1.updateEmployee)('EMP-TEST-001', { name: '' })).toThrow('cannot be empty');
        });
        test('should throw for non-existent employee', () => {
            expect(() => (0, employeeDirectory_1.updateEmployee)('FAKE', { name: 'X' })).toThrow('Employee not found');
        });
    });
    describe('deactivateEmployee / reactivateEmployee', () => {
        test('should deactivate an active employee', () => {
            const deactivated = (0, employeeDirectory_1.deactivateEmployee)('EMP-TEST-001');
            expect(deactivated.active).toBe(false);
        });
        test('should throw when deactivating already inactive employee', () => {
            expect(() => (0, employeeDirectory_1.deactivateEmployee)('EMP-TEST-001')).toThrow('already deactivated');
        });
        test('should reactivate a deactivated employee', () => {
            const reactivated = (0, employeeDirectory_1.reactivateEmployee)('EMP-TEST-001');
            expect(reactivated.active).toBe(true);
        });
        test('should throw when reactivating already active employee', () => {
            expect(() => (0, employeeDirectory_1.reactivateEmployee)('EMP-TEST-001')).toThrow('already active');
        });
    });
    describe('getEmployeeHashId', () => {
        test('should generate consistent hash for same employee', () => {
            const emp = (0, employeeDirectory_1.getEmployeeById)('EMP-TEST-001');
            if (emp) {
                const hash1 = (0, employeeDirectory_1.getEmployeeHashId)(emp);
                const hash2 = (0, employeeDirectory_1.getEmployeeHashId)(emp);
                expect(hash1).toBe(hash2);
                expect(hash1.length).toBe(64);
            }
        });
    });
    describe('listActiveEmployees', () => {
        test('should return only active employees', () => {
            const active = (0, employeeDirectory_1.listActiveEmployees)();
            active.forEach((emp) => {
                expect(emp.active).toBe(true);
            });
        });
    });
});
//# sourceMappingURL=employeeDirectory.test.js.map