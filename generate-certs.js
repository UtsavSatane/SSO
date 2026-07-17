const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed SSL certificates for localhost...');

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'US' },
  { name: 'stateOrProvinceName', value: 'California' },
  { name: 'localityName', value: 'San Francisco' },
  { name: 'organizationName', value: 'SSO Local Development' }
];

const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 365,
  keySize: 2048,
  extensions: [
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS
          value: 'localhost'
        },
        {
          type: 7, // IP
          value: '127.0.0.1'
        }
      ]
    }
  ]
});

fs.writeFileSync(path.join(certsDir, 'localhost.key'), pems.private);
fs.writeFileSync(path.join(certsDir, 'localhost.crt'), pems.cert);

console.log('SSL certificates successfully saved to:');
console.log(' - ' + path.join(certsDir, 'localhost.key'));
console.log(' - ' + path.join(certsDir, 'localhost.crt'));
