#!/usr/bin/env node

/**
 * Comprehensive Validation Script
 * Validates the entire application setup and configuration
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { runHealthCheck } = require('./healthCheck');

class ValidationRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'valid',
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runValidation() {
    console.log('🔍 Starting Medical Case Simulator Validation...\n');

    // File structure validation
    await this.validateFileStructure();
    
    // Environment validation
    await this.validateEnvironment();
    
    // Dependencies validation
    await this.validateDependencies();
    
    // Code quality validation
    await this.validateCodeQuality();
    
    // Configuration validation
    await this.validateConfiguration();
    
    // Security validation
    await this.validateSecurity();
    
    // Test validation
    await this.validateTests();
    
    // Health check validation
    await this.validateHealthCheck();

    this.printSummary();
    return this.results;
  }

  async validateFileStructure() {
    console.log('📁 Validating file structure...');
    
    const requiredFiles = [
      'server.js',
      'package.json',
      '.env.example',
      'jest.config.js',
      'README.md',
      'config/database.js',
      'config/auth.js',
      'config/redis.js',
      'config/swagger.js',
      'middleware/auth.js',
      'middleware/authorization.js',
      'middleware/validation.js',
      'middleware/errorHandler.js',
      'middleware/rateLimit.js',
      'middleware/monitoring.js',
      'middleware/security.js',
      'models/User.js',
      'models/Case.js',
      'models/Progress.js',
      'models/index.js',
      'routes/index.js',
      'routes/auth.js',
      'routes/cases.js',
      'routes/simulation.js',
      'services/simulationService.js',
      'services/notificationService.js',
      'utils/logger.js',
      'utils/constants.js',
      'scripts/healthCheck.js',
      'scripts/migrate.js',
      'tests/setup.js',
      'tests/teardown.js',
      'docs/API.md',
      'docs/DEPLOYMENT.md'
    ];

    const requiredDirectories = [
      'config',
      'controllers',
      'middleware',
      'models',
      'routes',
      'services',
      'utils',
      'tests',
      'tests/unit',
      'tests/integration',
      'docs',
      'scripts'
    ];

    let missingFiles = [];
    let missingDirs = [];

    // Check files
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        missingFiles.push(file);
      }
    }

    // Check directories
    for (const dir of requiredDirectories) {
      try {
        const stat = await fs.stat(dir);
        if (!stat.isDirectory()) {
          missingDirs.push(dir);
        }
      } catch (error) {
        missingDirs.push(dir);
      }
    }

    const status = (missingFiles.length === 0 && missingDirs.length === 0) ? 'passed' : 'failed';
    
    this.recordResult('File Structure', status, {
      missingFiles,
      missingDirectories: missingDirs,
      totalFiles: requiredFiles.length,
      totalDirectories: requiredDirectories.length
    });

    if (status === 'passed') {
      console.log('  ✅ All required files and directories present');
    } else {
      console.log(`  ❌ Missing ${missingFiles.length} files and ${missingDirs.length} directories`);
      if (missingFiles.length > 0) {
        console.log(`     Missing files: ${missingFiles.join(', ')}`);
      }
      if (missingDirs.length > 0) {
        console.log(`     Missing directories: ${missingDirs.join(', ')}`);
      }
    }
  }

  async validateEnvironment() {
    console.log('🌍 Validating environment...');
    
    const nodeVersion = process.version;
    const nodeVersionNumber = parseInt(nodeVersion.slice(1).split('.')[0]);
    const isNodeVersionValid = nodeVersionNumber >= 18;

    const requiredEnvVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    let envFileExists = false;
    let missingEnvVars = [];

    try {
      await fs.access('.env');
      envFileExists = true;
      
      // Load .env file
      require('dotenv').config();
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missingEnvVars.push(envVar);
        }
      }
    } catch (error) {
      // .env file doesn't exist
    }

    const status = isNodeVersionValid && (envFileExists || process.env.NODE_ENV === 'test') && missingEnvVars.length === 0 ? 'passed' : 'failed';
    
    this.recordResult('Environment', status, {
      nodeVersion,
      nodeVersionValid: isNodeVersionValid,
      envFileExists,
      missingEnvVars,
      platform: process.platform,
      arch: process.arch
    });

    if (status === 'passed') {
      console.log(`  ✅ Node.js ${nodeVersion} and environment configuration valid`);
    } else {
      console.log('  ❌ Environment validation failed:');
      if (!isNodeVersionValid) {
        console.log(`     - Node.js version ${nodeVersion} is below required 18.x`);
      }
      if (!envFileExists && process.env.NODE_ENV !== 'test') {
        console.log('     - .env file not found');
      }
      if (missingEnvVars.length > 0) {
        console.log(`     - Missing environment variables: ${missingEnvVars.join(', ')}`);
      }
    }
  }

  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const nodeModulesExists = await fs.access('node_modules').then(() => true).catch(() => false);
      
      let npmAuditResult = null;
      try {
        execSync('npm audit --audit-level moderate --json', { stdio: 'pipe' });
        npmAuditResult = { vulnerabilities: 0, status: 'clean' };
      } catch (error) {
        try {
          const auditOutput = JSON.parse(error.stdout.toString());
          npmAuditResult = {
            vulnerabilities: auditOutput.metadata?.vulnerabilities?.total || 0,
            status: 'vulnerabilities_found'
          };
        } catch (parseError) {
          npmAuditResult = { status: 'audit_failed' };
        }
      }

      const status = nodeModulesExists && npmAuditResult.vulnerabilities === 0 ? 'passed' : 
                    nodeModulesExists && npmAuditResult.vulnerabilities > 0 ? 'warning' : 'failed';
      
      this.recordResult('Dependencies', status, {
        nodeModulesExists,
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        dependencyCount: Object.keys(packageJson.dependencies || {}).length,
        devDependencyCount: Object.keys(packageJson.devDependencies || {}).length,
        auditResult: npmAuditResult
      });

      if (status === 'passed') {
        console.log('  ✅ Dependencies installed and secure');
      } else if (status === 'warning') {
        console.log(`  ⚠️  Dependencies installed but ${npmAuditResult.vulnerabilities} vulnerabilities found`);
      } else {
        console.log('  ❌ Dependencies validation failed');
        if (!nodeModulesExists) {
          console.log('     - node_modules directory not found (run npm install)');
        }
      }
    } catch (error) {
      this.recordResult('Dependencies', 'failed', { error: error.message });
      console.log('  ❌ Dependencies validation failed:', error.message);
    }
  }

  async validateCodeQuality() {
    console.log('🔍 Validating code quality...');
    
    let lintResult = null;
    let formatResult = null;

    try {
      execSync('npm run lint', { stdio: 'pipe' });
      lintResult = { status: 'passed', errors: 0 };
    } catch (error) {
      lintResult = { status: 'failed', output: error.stdout.toString() };
    }

    try {
      execSync('npm run format:check', { stdio: 'pipe' });
      formatResult = { status: 'passed' };
    } catch (error) {
      formatResult = { status: 'failed', output: error.stdout.toString() };
    }

    const status = lintResult.status === 'passed' && formatResult.status === 'passed' ? 'passed' : 'failed';
    
    this.recordResult('Code Quality', status, {
      linting: lintResult,
      formatting: formatResult
    });

    if (status === 'passed') {
      console.log('  ✅ Code quality checks passed');
    } else {
      console.log('  ❌ Code quality checks failed:');
      if (lintResult.status === 'failed') {
        console.log('     - ESLint errors found (run npm run lint:fix)');
      }
      if (formatResult.status === 'failed') {
        console.log('     - Code formatting issues found (run npm run format)');
      }
    }
  }

  async validateConfiguration() {
    console.log('⚙️  Validating configuration...');
    
    const configFiles = [
      'jest.config.js',
      'config/database.js',
      'config/auth.js',
      'config/redis.js',
      'config/swagger.js'
    ];

    let validConfigs = 0;
    let configErrors = [];

    for (const configFile of configFiles) {
      try {
        require(path.resolve(configFile));
        validConfigs++;
      } catch (error) {
        configErrors.push({ file: configFile, error: error.message });
      }
    }

    const status = configErrors.length === 0 ? 'passed' : 'failed';
    
    this.recordResult('Configuration', status, {
      totalConfigs: configFiles.length,
      validConfigs,
      configErrors
    });

    if (status === 'passed') {
      console.log('  ✅ All configuration files valid');
    } else {
      console.log(`  ❌ ${configErrors.length} configuration files have errors`);
      configErrors.forEach(({ file, error }) => {
        console.log(`     - ${file}: ${error}`);
      });
    }
  }

  async validateSecurity() {
    console.log('🔒 Validating security...');
    
    const securityChecks = {
      jwtSecretStrength: false,
      httpsEnforced: false,
      securityHeaders: false,
      rateLimiting: false,
      inputValidation: false
    };

    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
      securityChecks.jwtSecretStrength = true;
    }

    // Check for security middleware
    try {
      const serverContent = await fs.readFile('server.js', 'utf8');
      if (serverContent.includes('helmet')) {
        securityChecks.securityHeaders = true;
      }
      if (serverContent.includes('rateLimit')) {
        securityChecks.rateLimiting = true;
      }
    } catch (error) {
      // Server file not readable
    }

    // Check for input validation
    try {
      await fs.access('middleware/validation.js');
      securityChecks.inputValidation = true;
    } catch (error) {
      // Validation middleware not found
    }

    // Check HTTPS enforcement (in production)
    if (process.env.NODE_ENV !== 'production' || process.env.HTTPS_ENFORCED === 'true') {
      securityChecks.httpsEnforced = true;
    }

    const passedChecks = Object.values(securityChecks).filter(Boolean).length;
    const totalChecks = Object.keys(securityChecks).length;
    const status = passedChecks === totalChecks ? 'passed' : passedChecks >= totalChecks * 0.8 ? 'warning' : 'failed';
    
    this.recordResult('Security', status, {
      checks: securityChecks,
      passedChecks,
      totalChecks
    });

    if (status === 'passed') {
      console.log('  ✅ All security checks passed');
    } else if (status === 'warning') {
      console.log(`  ⚠️  ${passedChecks}/${totalChecks} security checks passed`);
    } else {
      console.log(`  ❌ Security validation failed (${passedChecks}/${totalChecks} checks passed)`);
    }
  }

  async validateTests() {
    console.log('🧪 Validating tests...');
    
    let testResult = null;
    
    try {
      execSync('npm run test:ci', { stdio: 'pipe' });
      testResult = { status: 'passed', coverage: 'adequate' };
    } catch (error) {
      const output = error.stdout.toString();
      testResult = { 
        status: 'failed', 
        output: output.substring(0, 500) + (output.length > 500 ? '...' : '')
      };
    }

    // Check test file structure
    const testDirs = ['tests/unit', 'tests/integration'];
    let testFilesCount = 0;
    
    for (const dir of testDirs) {
      try {
        const files = await fs.readdir(dir, { recursive: true });
        testFilesCount += files.filter(file => file.endsWith('.test.js')).length;
      } catch (error) {
        // Directory doesn't exist or not readable
      }
    }

    const status = testResult.status === 'passed' && testFilesCount > 0 ? 'passed' : 'failed';
    
    this.recordResult('Tests', status, {
      testResult,
      testFilesCount,
      testDirs
    });

    if (status === 'passed') {
      console.log(`  ✅ All tests passed (${testFilesCount} test files)`);
    } else {
      console.log('  ❌ Test validation failed:');
      if (testResult.status === 'failed') {
        console.log('     - Test execution failed');
      }
      if (testFilesCount === 0) {
        console.log('     - No test files found');
      }
    }
  }

  async validateHealthCheck() {
    console.log('🏥 Validating health check...');
    
    try {
      const healthResult = await runHealthCheck();
      
      const status = healthResult.status === 'healthy' ? 'passed' : 
                    healthResult.status === 'degraded' ? 'warning' : 'failed';
      
      this.recordResult('Health Check', status, {
        healthStatus: healthResult.status,
        passedChecks: healthResult.summary.passed,
        totalChecks: healthResult.summary.total,
        uptime: healthResult.metrics.uptime
      });

      if (status === 'passed') {
        console.log('  ✅ Health check passed - system healthy');
      } else if (status === 'warning') {
        console.log('  ⚠️  Health check warning - system degraded');
      } else {
        console.log('  ❌ Health check failed - system unhealthy');
      }
    } catch (error) {
      this.recordResult('Health Check', 'failed', { error: error.message });
      console.log('  ❌ Health check validation failed:', error.message);
    }
  }

  recordResult(checkName, status, details) {
    this.results.checks[checkName] = {
      status,
      details,
      timestamp: new Date().toISOString()
    };

    this.results.summary.total++;
    
    if (status === 'passed') {
      this.results.summary.passed++;
    } else if (status === 'warning') {
      this.results.summary.warnings++;
    } else {
      this.results.summary.failed++;
      this.results.status = 'invalid';
    }
  }

  printSummary() {
    console.log('\n📊 Validation Summary:');
    console.log(`Status: ${this.getStatusEmoji()} ${this.results.status.toUpperCase()}`);
    console.log(`Total Checks: ${this.results.summary.total}`);
    console.log(`Passed: ✅ ${this.results.summary.passed}`);
    console.log(`Warnings: ⚠️  ${this.results.summary.warnings}`);
    console.log(`Failed: ❌ ${this.results.summary.failed}`);
    
    if (this.results.status === 'valid') {
      console.log('\n🎉 Application is ready for deployment!');
    } else {
      console.log('\n🔧 Please fix the issues above before deployment.');
    }
  }

  getStatusEmoji() {
    switch (this.results.status) {
      case 'valid': return '🟢';
      case 'invalid': return '🔴';
      default: return '⚪';
    }
  }
}

// Main execution
const runValidation = async () => {
  const validator = new ValidationRunner();
  const results = await validator.runValidation();
  
  if (process.argv.includes('--json')) {
    console.log('\n📄 JSON Output:');
    console.log(JSON.stringify(results, null, 2));
  }
  
  const exitCode = results.status === 'valid' ? 0 : 1;
  
  if (process.argv.includes('--exit')) {
    process.exit(exitCode);
  }
  
  return results;
};

// Export for use in other modules
module.exports = {
  ValidationRunner,
  runValidation
};

// Run if called directly
if (require.main === module) {
  runValidation().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}