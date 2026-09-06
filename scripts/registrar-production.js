#!/usr/bin/env node
const fs = require('fs');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function findBuild(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.id === 'string' && (value.platform === 'android' || value.status || value.buildProfile)) return value;
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findBuild(child);
    if (found) return found;
  }
  return null;
}

async function run() {
  const expo = readJSON('app.json').expo;
  const runtimeVersion = String(expo.runtimeVersion || '').trim();
  const result = findBuild(readJSON('.eas-build-result.json'));
  if (!runtimeVersion) throw new Error('app.json no tiene runtimeVersion.');
  if (!result?.id) throw new Error('EAS no devolvio un buildId valido.');

  const admin = require('../functions/node_modules/firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: 'amor-9df0d' });
  const db = admin.firestore();
  db.settings({ preferRest: true });
  await db.collection('actualizaciones').doc('amor').set({
    appId: 'amor',
    runtimeVersion,
    easBuildId: result.id,
    expectedFileName: `amor-${result.id}.apk`,
    installationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedBy: 'Amor production build',
  }, { merge: true });

  console.log(`Build ${result.id} registrada con runtime ${runtimeVersion}.`);
  console.log(`Nombre esperado en Love System: amor-${result.id}.apk`);
}

run().catch(error => {
  console.error(`La build termino, pero no se pudo registrar su identidad: ${error.message}`);
  process.exit(1);
});
