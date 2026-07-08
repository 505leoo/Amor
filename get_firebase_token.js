const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const querystring = require('querystring');

function getFirebaseAccessToken() {
  return new Promise((resolve, reject) => {
    // Cargar credenciales
    const credentials = JSON.parse(fs.readFileSync('amor-9df0d-firebase-adminsdk-fbsvc-4866aa0a28.json', 'utf8'));
    
    // Crear JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };
    
    const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });
    
    // Intercambiar por access token
    const postData = querystring.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    });
    
    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        resolve(response.access_token);
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Usar la función
getFirebaseAccessToken()
  .then(token => console.log('Access Token:', token))
  .catch(error => console.error('Error:', error));