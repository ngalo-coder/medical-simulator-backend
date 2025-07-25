const http = require('http');
const https = require('https');

const healthCheck = () => {
  const protocol = process.env.NODE_ENV === 'production' ? https : http;
  const hostname = process.env.NODE_ENV === 'production' 
    ? 'medical-case-simulator-api.onrender.com' 
    : 'localhost';
  const port = process.env.PORT || 10000;

  const options = {
    hostname,
    port: process.env.NODE_ENV === 'production' ? 443 : port,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = protocol.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Health check passed');
        console.log('Response:', JSON.parse(data));
        process.exit(0);
      } else {
        console.error('❌ Health check failed with status:', res.statusCode);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Health check request failed:', err.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

// Run health check
healthCheck();