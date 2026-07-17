const https = require('https');

// Ignore TLS errors for self-signed certificates in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('--- SSO/OIDC System Verification Script ---');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function verify() {
  let success = true;

  console.log('Checking Identity Provider discovery endpoint...');
  try {
    const config = await fetchJson('https://localhost:5000/.well-known/openid-configuration');
    console.log('✅ Identity Provider is ONLINE');
    console.log(` - Issuer: ${config.issuer}`);
    console.log(` - Authorization Endpoint: ${config.authorization_endpoint}`);
    console.log(` - Token Endpoint: ${config.token_endpoint}`);
    console.log(` - JWKS URI: ${config.jwks_uri}`);
    console.log(` - Supported Claims: ${config.claims_supported.join(', ')}`);
  } catch (err) {
    console.error('❌ Identity Provider is OFFLINE or returning errors:', err.message);
    success = false;
  }

  console.log('\nChecking Portal-A session API...');
  try {
    const session = await fetchJson('https://localhost:5001/api/session');
    console.log('✅ Portal-A is ONLINE');
    console.log(` - Authenticated: ${session.authenticated}`);
  } catch (err) {
    console.error('❌ Portal-A is OFFLINE or returning errors:', err.message);
    success = false;
  }

  console.log('\nChecking Portal-B session API...');
  try {
    const session = await fetchJson('https://localhost:5002/api/session');
    console.log('✅ Portal-B is ONLINE');
    console.log(` - Authenticated: ${session.authenticated}`);
  } catch (err) {
    console.error('❌ Portal-B is OFFLINE or returning errors:', err.message);
    success = false;
  }

  if (success) {
    console.log('\n✅ All backend systems verified successfully!');
  } else {
    console.log('\n❌ Verification failed. Please ensure the servers are running.');
    process.exit(1);
  }
}

verify();
