// Run with: node test-push.js
const https = require('https');

const data = JSON.stringify({
  org_id: 'b50f276c-3c79-472e-baba-0a2594d05f84',
  title: 'Test push',
  body: 'Hello from Go Capture',
  url: '/review'
});

const options = {
  hostname: 'invoice-capture-pwa.vercel.app',
  path: '/api/push/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-secret': 'qwertyuiop',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
