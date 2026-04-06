const axios = require('axios');

async function testApi() {
  const baseUrl = 'http://localhost:3001/api';
  console.log('--- Testing SafeRoute API ---');
  
  try {
    // 1. Health Check
    const health = await axios.get(`${baseUrl}/../health`);
    console.log('✅ Health Check:', health.data);

    // 2. Auth Stubs check
    try {
      await axios.post(`${baseUrl}/auth/login`, {
        email: 'nonexistent@example.com',
        password: 'wrong'
      });
    } catch (e) {
      console.log('✅ Login (Negative Case):', e.response?.data || e.message);
    }

    // 3. Check Schools list
    const schools = await axios.get(`${baseUrl}/schools`);
    console.log('✅ Schools List:', schools.data);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

testApi();
