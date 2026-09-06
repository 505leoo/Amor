#!/usr/bin/env node
const fs = require('fs');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

async function run() {
  const app = readJSON('app.json').expo;
  const runtimeVersion = typeof app.runtimeVersion === 'string'
    ? app.runtimeVersion.trim()
    : '';

  if (!runtimeVersion) {
    throw new Error('app.json no tiene un runtimeVersion válido.');
  }

  const admin = require('../functions/node_modules/firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: 'amor-9df0d' });

  await admin.firestore().collection('actualizaciones').doc('amor').set({
    appId: 'amor',
    runtimeVersion,
    installationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedBy: 'Amor production build',
  }, { merge: true });

  console.log(`Runtime ${runtimeVersion} sincronizado con Love System.`);
}

run().catch(error => {
  console.error(`La build terminó, pero no se pudo sincronizar el runtime: ${error.message}`);
  process.exit(1);
});
