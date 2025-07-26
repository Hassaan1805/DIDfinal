/**
 * Development Configuration Validator
 * 
 * This script checks that all necessary configurations are in place
 * to prevent common development roadblocks.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ConfigCheck {
  name: string;
  path: string;
  required: boolean;
  validate?: (content: string) => string[];
}

class DevConfigValidator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate Vite configuration
   */
  private validateViteConfig(content: string): string[] {
    const errors: string[] = [];
    
    if (!content.includes('proxy')) {
      errors.push('Missing proxy configuration in vite.config.ts');
    }
    
    if (!content.includes('/api')) {
      errors.push('Missing /api proxy route in vite.config.ts');
    }
    
    if (!content.includes('3001')) {
      errors.push('Missing backend port (3001) in proxy configuration');
    }
    
    if (!content.includes('changeOrigin: true')) {
      errors.push('Missing changeOrigin: true in proxy configuration');
    }
    
    return errors;
  }

  /**
   * Validate package.json scripts
   */
  private validatePackageJson(content: string, projectType: 'backend' | 'portal'): string[] {
    const errors: string[] = [];
    
    try {
      const pkg = JSON.parse(content);
      
      if (!pkg.scripts) {
        errors.push('Missing scripts section in package.json');
        return errors;
      }
      
      if (projectType === 'backend') {
        if (!pkg.scripts.dev) {
          errors.push('Missing "dev" script in backend package.json');
        }
        if (!pkg.dependencies?.express) {
          errors.push('Missing Express dependency in backend');
        }
        if (!pkg.dependencies?.cors) {
          errors.push('Missing CORS dependency in backend');
        }
      } else if (projectType === 'portal') {
        if (!pkg.scripts.dev) {
          errors.push('Missing "dev" script in portal package.json');
        }
        if (!pkg.dependencies?.react) {
          errors.push('Missing React dependency in portal');
        }
        if (!pkg.devDependencies?.vite) {
          errors.push('Missing Vite dependency in portal');
        }
      }
    } catch (e) {
      errors.push('Invalid JSON in package.json');
    }
    
    return errors;
  }

  /**
   * Validate environment file
   */
  private validateEnvFile(content: string, projectType: 'backend' | 'portal'): string[] {
    const errors: string[] = [];
    
    if (projectType === 'backend') {
      if (!content.includes('PORT=3001')) {
        errors.push('Missing or incorrect PORT configuration in backend .env');
      }
      if (!content.includes('NODE_ENV=development')) {
        errors.push('Missing NODE_ENV=development in backend .env');
      }
    } else if (projectType === 'portal') {
      if (!content.includes('VITE_API_URL=/api')) {
        errors.push('Missing VITE_API_URL=/api in portal .env');
      }
    }
    
    return errors;
  }

  /**
   * Check all configurations
   */
  public validateAll(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const checks: ConfigCheck[] = [
      // Vite configuration
      {
        name: 'Vite Config',
        path: 'portal/vite.config.ts',
        required: true,
        validate: this.validateViteConfig,
      },
      // Package.json files
      {
        name: 'Backend Package.json',
        path: 'backend/package.json',
        required: true,
        validate: (content) => this.validatePackageJson(content, 'backend'),
      },
      {
        name: 'Portal Package.json',
        path: 'portal/package.json',
        required: true,
        validate: (content) => this.validatePackageJson(content, 'portal'),
      },
      // Environment files
      {
        name: 'Backend Environment',
        path: 'backend/.env.development',
        required: false,
        validate: (content) => this.validateEnvFile(content, 'backend'),
      },
      {
        name: 'Portal Environment',
        path: 'portal/.env.development',
        required: false,
        validate: (content) => this.validateEnvFile(content, 'portal'),
      },
      // Node modules
      {
        name: 'Backend Node Modules',
        path: 'backend/node_modules',
        required: true,
      },
      {
        name: 'Portal Node Modules',
        path: 'portal/node_modules',
        required: true,
      },
    ];

    for (const check of checks) {
      const fullPath = join(this.projectRoot, check.path);
      
      if (!existsSync(fullPath)) {
        if (check.required) {
          errors.push(`Missing required file/directory: ${check.path}`);
        } else {
          warnings.push(`Optional file missing: ${check.path}`);
        }
        continue;
      }
      
      if (check.validate) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const validationErrors = check.validate(content);
          errors.push(...validationErrors.map(err => `${check.name}: ${err}`));
        } catch (e) {
          errors.push(`Failed to read ${check.path}: ${e}`);
        }
      }
    }

    // Additional checks
    this.checkPortAvailability(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if required ports are available
   */
  private checkPortAvailability(errors: string[], warnings: string[]): void {
    // Note: This is a simplified check. In a real implementation,
    // you would use a library like 'detect-port' to check port availability.
    warnings.push('Port availability check skipped (requires runtime check)');
  }

  /**
   * Generate configuration report
   */
  public generateReport(): string {
    const result = this.validateAll();
    
    let report = '🔍 Development Configuration Validation Report\n';
    report += '================================================\n\n';
    
    if (result.valid) {
      report += '✅ All configurations are valid!\n';
    } else {
      report += '❌ Configuration issues found:\n\n';
      
      if (result.errors.length > 0) {
        report += 'ERRORS (must fix):\n';
        for (const error of result.errors) {
          report += `  ❌ ${error}\n`;
        }
        report += '\n';
      }
    }
    
    if (result.warnings.length > 0) {
      report += 'WARNINGS (recommended to fix):\n';
      for (const warning of result.warnings) {
        report += `  ⚠️  ${warning}\n`;
      }
      report += '\n';
    }
    
    report += 'Quick Fix Commands:\n';
    report += '==================\n';
    report += '# Install dependencies:\n';
    report += 'cd backend && npm install\n';
    report += 'cd portal && npm install\n\n';
    report += '# Start development servers:\n';
    report += 'cd backend && npm run dev\n';
    report += 'cd portal && npm run dev\n\n';
    report += '# Check Vite proxy configuration:\n';
    report += 'cat portal/vite.config.ts\n\n';
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const validator = new DevConfigValidator();
  console.log(validator.generateReport());
}

export default DevConfigValidator;
