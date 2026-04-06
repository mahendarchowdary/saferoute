/**
 * SafeRoute GPS Pipeline Test & Logger
 * 
 * This script helps you test the entire GPS pipeline and see logs
 * Run with: node test-gps.js
 */

const axios = require('axios');
const WebSocket = require('ws');
const { exec } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg) => console.log(`${colors.magenta}▶️  ${msg}${colors.reset}`),
};

// Test configuration
const config = {
  api: 'http://localhost:3001/api',
  gps: 'ws://localhost:3002',
  redis: 'localhost:6379',
};

class GPSTester {
  constructor() {
    this.results = {
      api: false,
      gps: false,
      websocket: false,
      database: false,
      redis: false,
    };
    this.gpsMessages = [];
  }

  async runAllTests() {
    log.header('🚌 SafeRoute GPS Pipeline Test');
    log.info('Testing all services...\n');

    await this.testAPI();
    await this.testGPSHealth();
    await this.testWebSocket();
    
    this.printSummary();
  }

  async testAPI() {
    log.step('Testing API Server...');
    try {
      const response = await axios.get(`${config.api}/health`, { timeout: 5000 });
      if (response.status === 200) {
        log.success('API Server is RUNNING');
        this.results.api = true;
      }
    } catch (error) {
      log.error(`API Server FAILED: ${error.message}`);
      log.warn('Make sure API is running: cd apps/api && npm run dev');
    }
  }

  async testGPSHealth() {
    log.step('Testing GPS Service...');
    try {
      const response = await axios.get(`${config.gps.replace('ws://', 'http://')}/health`, { timeout: 5000 });
      if (response.data.status === 'healthy') {
        log.success('GPS Service is RUNNING');
        this.results.gps = true;
        
        if (response.data.database) {
          log.success('GPS Database: Connected');
          this.results.database = true;
        } else {
          log.warn('GPS Database: Not connected (using memory fallback)');
        }
        
        if (response.data.redis) {
          log.success('GPS Redis: Connected');
          this.results.redis = true;
        } else {
          log.warn('GPS Redis: Not connected');
        }
      }
    } catch (error) {
      log.error(`GPS Service FAILED: ${error.message}`);
      log.warn('Make sure GPS is running: cd apps/gps-service && go run main.go');
    }
  }

  async testWebSocket() {
    log.step('Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`${config.gps}/ws?token=test-token&tripId=test-trip`);
        
        ws.on('open', () => {
          log.success('WebSocket connected successfully');
          
          // Send test GPS ping
          ws.send(JSON.stringify({
            type: 'location',
            data: {
              lat: 12.9716,
              lng: 77.5946,
              speed: 25.5,
              heading: 90,
              accuracy: 5,
              battery: 85
            }
          }));
          
          log.info('Sent test GPS ping: Bangalore location');
        });
        
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          this.gpsMessages.push(msg);
          log.success(`Received GPS data: Lat=${msg.lat}, Lng=${msg.lng}`);
          this.results.websocket = true;
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          log.error(`WebSocket error: ${error.message}`);
          log.warn('Check if GPS service is running and JWT token is valid');
          resolve();
        });
        
        setTimeout(() => {
          if (!this.results.websocket) {
            log.warn('WebSocket test timeout - no response received');
            ws.close();
            resolve();
          }
        }, 10000);
        
      } catch (error) {
        log.error(`WebSocket test failed: ${error.message}`);
        resolve();
      }
    });
  }

  printSummary() {
    log.header('📊 Test Summary');
    
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(v => v).length;
    
    console.log(`Tests passed: ${passedTests}/${totalTests}\n`);
    
    Object.entries(this.results).forEach(([service, passed]) => {
      const icon = passed ? '✅' : '❌';
      const color = passed ? colors.green : colors.red;
      console.log(`${color}${icon} ${service.toUpperCase()}${colors.reset}`);
    });
    
    if (passedTests === totalTests) {
      log.success('\n🎉 All systems operational! GPS pipeline is ready.');
    } else {
      log.warn('\n⚠️  Some services need attention. Check logs above.');
    }
    
    if (this.gpsMessages.length > 0) {
      log.header('📍 GPS Messages Received');
      this.gpsMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. Lat: ${msg.lat}, Lng: ${msg.lng}, Speed: ${msg.speed}km/h`);
      });
    }
  }
}

// Run tests
const tester = new GPSTester();
tester.runAllTests().catch(console.error);
