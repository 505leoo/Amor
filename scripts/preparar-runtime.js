#!/usr/bin/env node
const fs = require('fs');

const path = 'app.json';
const backupPath = '.runtime-version-backup.json';
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, path);
  fs.unlinkSync(backupPath);
}
const document = JSON.parse(fs.readFileSync(path, 'utf8'));
const expo = document.expo || {};
const current = String(expo.runtimeVersion || '').trim();
const parts = current.split('.');

if (!current || parts.some(part => !/^\d+$/.test(part))) {
  throw new Error(`runtimeVersion invalido: ${current || '(vacio)'}`);
}

fs.writeFileSync(backupPath, `${JSON.stringify(document, null, 2)}\n`);
const last = parts.length - 1;
parts[last] = String(Number(parts[last]) + 1);
const next = parts.join('.');
expo.runtimeVersion = next;
document.expo = expo;
fs.writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Runtime preparado para la nueva build: ${current} -> ${next}`);
