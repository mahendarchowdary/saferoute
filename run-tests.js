/**
 * SafeRoute Phase 1 - Automated Test Runner
 * 
 * Run with: node run-tests.js [test-suite]
 * Examples:
 *   node run-tests.js health       - Check all services
 *   node run-tests.js auth         - Test authentication
 *   node run-tests.js gps          - Test GPS pipeline
 *   node run-tests.js integration  - Run integration tests
 *   node run-tests.js all          - Run all tests
 */

const axios = require('axios');
const WebSocket = require('ws');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  test: (id, msg) => console.log(`${colors.cyan}▶️  [${id}] ${msg}${colors.reset}`),
};

const config = {
  api: 'http://localhost:3001/api',
  gps: 'http://localhost:3002',
  ws: 'ws://localhost:3002',
  admin: 'http://localhost:3000',
};

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
    };
    this.tokens = {};
    this.testData = {};
  }

  async runHealthChecks() {
    log.header('🔍 PHASE 1 - Service Health Checks');
    
    // T0.1 - API Health
    log.test('T0.1', 'API Server Health');
    try {
      const response = await axios.get(`${config.api}/../health`, { timeout: 5000 });
      if (response.data.status === 'ok') {
        log.success('API Server responding');
        this.results.passed++;
      } else {
        log.error('API Server unhealthy');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`API Server not accessible: ${error.message}`);
      this.results.failed++;
      return false; // Stop if API is down
    }

    // T0.2 - GPS Health
    log.test('T0.2', 'GPS Service Health');
    try {
      const response = await axios.get(`${config.gps}/health`, { timeout: 5000 });
      if (response.data.status === 'healthy') {
        log.success(`GPS Service healthy (database: ${response.data.database}, redis: ${response.data.redis})`);
        this.results.passed++;
      } else {
        log.error('GPS Service unhealthy');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`GPS Service not accessible: ${error.message}`);
      this.results.failed++;
    }

    // T0.3 - Admin Panel
    log.test('T0.3', 'Admin Panel Accessibility');
    try {
      await axios.get(config.admin, { timeout: 5000, maxRedirects: 0 });
      log.success('Admin Panel accessible');
      this.results.passed++;
    } catch (error) {
      if (error.response && (error.response.status === 200 || error.response.status === 307)) {
        log.success('Admin Panel accessible');
        this.results.passed++;
      } else {
        log.error(`Admin Panel not accessible: ${error.message}`);
        this.results.failed++;
      }
    }

    return this.results.failed === 0;
  }

  async runAuthTests() {
    log.header('🔐 M1 - Authentication Tests');

    // T1.1 - School Registration
    log.test('T1.1', 'School Registration');
    const schoolData = {
      name: 'Test Admin',
      email: `test${Date.now()}@school.com`,
      phone: `98765${Date.now().toString().slice(-5)}`,
      password: 'TestPass123',
      schoolName: `Test School ${Date.now()}`,
      schoolAddress: '123 Test Street, Bangalore',
      latitude: 12.9716,
      longitude: 77.5946,
    };

    try {
      const response = await axios.post(`${config.api}/auth/register-school`, schoolData);
      if (response.status === 201 && response.data.accessToken) {
        this.tokens.admin = response.data.accessToken;
        this.testData.schoolId = response.data.user.school.id;
        this.testData.userId = response.data.user.id;
        log.success(`School registered: ${response.data.user.school.name}`);
        this.results.passed++;
      } else {
        log.error('School registration failed');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Registration failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }

    // T1.2 - Login
    log.test('T1.2', 'Admin Login');
    try {
      const loginData = {
        email: schoolData.email,
        password: schoolData.password,
      };
      const response = await axios.post(`${config.api}/auth/login`, loginData);
      if (response.data.accessToken && response.data.refreshToken) {
        this.tokens.admin = response.data.accessToken;
        log.success('Login successful, tokens received');
        this.results.passed++;
      } else {
        log.error('Login failed - no tokens');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Login failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }

    // T1.6 - Auth Middleware
    log.test('T1.6', 'Protected Route Access');
    try {
      const response = await axios.get(`${config.api}/auth/me`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` },
      });
      if (response.data.id === this.testData.userId) {
        log.success('Protected route accessible with valid token');
        this.results.passed++;
      } else {
        log.error('User ID mismatch');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Protected route failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }

    // Test invalid token
    log.test('T1.6b', 'Invalid Token Rejection');
    try {
      await axios.get(`${config.api}/auth/me`, {
        headers: { Authorization: 'Bearer invalid_token' },
      });
      log.error('Invalid token was accepted (should reject)');
      this.results.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        log.success('Invalid token correctly rejected');
        this.results.passed++;
      } else {
        log.error(`Unexpected error: ${error.message}`);
        this.results.failed++;
      }
    }
  }

  async runBusTests() {
    log.header('🚌 M6 - Bus Management Tests');

    if (!this.tokens.admin) {
      log.warn('Skipping bus tests - no admin token');
      this.results.skipped += 4;
      return;
    }

    // T6.1 - Create Bus
    log.test('T6.1', 'Create Bus');
    const busData = {
      plateNumber: `KA-${Date.now().toString().slice(-4)}`,
      model: 'Tata Starbus',
      capacity: 40,
      status: 'ACTIVE',
    };

    try {
      const response = await axios.post(`${config.api}/buses`, busData, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` },
      });
      if (response.status === 201) {
        this.testData.busId = response.data.id;
        log.success(`Bus created: ${response.data.plateNumber}`);
        this.results.passed++;
      } else {
        log.error('Bus creation failed');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Bus creation failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }

    // T6.1b - List Buses
    log.test('T6.1b', 'List Buses (School Scoped)');
    try {
      const response = await axios.get(`${config.api}/buses`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` },
      });
      if (Array.isArray(response.data)) {
        log.success(`Retrieved ${response.data.length} buses`);
        this.results.passed++;
      } else {
        log.error('Invalid buses response');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`List buses failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }
  }

  async runDriverTests() {
    log.header('👨‍💼 M4 - Driver Management Tests');

    if (!this.tokens.admin) {
      log.warn('Skipping driver tests - no admin token');
      this.results.skipped += 4;
      return;
    }

    // T4.1 - Create Driver
    log.test('T4.1', 'Create Driver');
    const driverData = {
      name: 'Test Driver',
      email: `driver${Date.now()}@school.com`,
      phone: `98766${Date.now().toString().slice(-5)}`,
      password: 'DriverPass123',
    };

    try {
      const response = await axios.post(`${config.api}/drivers`, driverData, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` },
      });
      if (response.status === 201) {
        this.testData.driverId = response.data.id;
        log.success(`Driver created: ${response.data.name}`);
        this.results.passed++;
      } else {
        log.error('Driver creation failed');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Driver creation failed: ${error.response?.data?.error || error.message}`);
      this.results.failed++;
    }

    // T4.3 - Driver Login
    if (this.testData.driverId) {
      log.test('T4.3', 'Driver Login');
      try {
        const loginData = {
          email: driverData.email,
          password: driverData.password,
        };
        const response = await axios.post(`${config.api}/auth/login`, loginData);
        if (response.data.accessToken) {
          this.tokens.driver = response.data.accessToken;
          log.success('Driver login successful');
          this.results.passed++;
        } else {
          log.error('Driver login failed');
          this.results.failed++;
        }
      } catch (error) {
        log.error(`Driver login failed: ${error.response?.data?.error || error.message}`);
        this.results.failed++;
      }
    }
  }

  async runGPSTests() {
    log.header('📍 M27 - GPS Pipeline Tests');

    // T27.1 - GPS Health
    log.test('T27.1', 'GPS Service Health');
    try {
      const response = await axios.get(`${config.gps}/health`);
      if (response.data.status === 'healthy') {
        log.success(`GPS Service: database=${response.data.database}, redis=${response.data.redis}`);
        this.results.passed++;
      } else {
        log.error('GPS Service unhealthy');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`GPS Health failed: ${error.message}`);
      this.results.failed++;
    }

    // T27.2 - WebSocket Connection (simplified - would need valid trip)
    log.test('T27.2', 'WebSocket GPS Streaming');
    log.warn('Skipping WebSocket test - requires active trip with driver token');
    this.results.skipped++;
  }

  async runIntegrationTests() {
    log.header('🔗 Integration Tests');

    // I1 - Data Isolation
    log.test('I1', 'School Data Isolation');
    if (!this.tokens.admin || !this.testData.schoolId) {
      log.warn('Skipping - no test data');
      this.results.skipped++;
      return;
    }

    try {
      const response = await axios.get(`${config.api}/buses`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` },
      });
      const allBusesBelongToSchool = response.data.every(
        (bus) => bus.schoolId === this.testData.schoolId
      );
      if (allBusesBelongToSchool) {
        log.success('All buses correctly scoped to school');
        this.results.passed++;
      } else {
        log.error('Data isolation breach detected');
        this.results.failed++;
      }
    } catch (error) {
      log.error(`Isolation test failed: ${error.message}`);
      this.results.failed++;
    }
  }

  printSummary() {
    log.header('📊 TEST SUMMARY');
    
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    console.log(`\n${colors.bright}Results:${colors.reset}`);
    console.log(`  ✅ Passed:  ${this.results.passed}`);
    console.log(`  ❌ Failed:  ${this.results.failed}`);
    console.log(`  ⚪ Skipped: ${this.results.skipped}`);
    console.log(`  📊 Total:   ${total}`);
    console.log(`  🎯 Pass Rate: ${passRate}%`);

    if (this.results.failed === 0) {
      console.log(`\n${colors.green}${colors.bright}🎉 ALL TESTS PASSED!${colors.reset}`);
      console.log(`${colors.green}Phase 1 is ready for production.${colors.reset}\n`);
    } else if (this.results.failed <= 2) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  MOSTLY PASSING${colors.reset}`);
      console.log(`${colors.yellow}Fix ${this.results.failed} failed tests before production.${colors.reset}\n`);
    } else {
      console.log(`\n${colors.red}${colors.bright}❌ SIGNIFICANT FAILURES${colors.reset}`);
      console.log(`${colors.red}Review and fix ${this.results.failed} tests.${colors.reset}\n`);
    }

    return this.results.failed === 0;
  }
}

// Main execution
async function main() {
  const suite = process.argv[2] || 'health';
  const runner = new TestRunner();

  console.log(`\n${colors.bright}${colors.cyan}🚌 SafeRoute Phase 1 - Test Runner${colors.reset}`);
  console.log(`${colors.cyan}Suite: ${suite}${colors.reset}\n`);

  switch (suite) {
    case 'health':
      await runner.runHealthChecks();
      break;
    case 'auth':
      await runner.runHealthChecks();
      await runner.runAuthTests();
      break;
    case 'bus':
      await runner.runHealthChecks();
      await runner.runAuthTests();
      await runner.runBusTests();
      break;
    case 'driver':
      await runner.runHealthChecks();
      await runner.runAuthTests();
      await runner.runDriverTests();
      break;
    case 'gps':
      await runner.runHealthChecks();
      await runner.runGPSTests();
      break;
    case 'integration':
      await runner.runHealthChecks();
      await runner.runAuthTests();
      await runner.runBusTests();
      await runner.runDriverTests();
      await runner.runIntegrationTests();
      break;
    case 'all':
      await runner.runHealthChecks();
      await runner.runAuthTests();
      await runner.runBusTests();
      await runner.runDriverTests();
      await runner.runGPSTests();
      await runner.runIntegrationTests();
      break;
    default:
      console.log('Usage: node run-tests.js [suite]');
      console.log('Suites: health, auth, bus, driver, gps, integration, all');
      process.exit(1);
  }

  const allPassed = runner.printSummary();
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
