#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['node_modules', '.git', 'android', 'ios']);
const failures = [];

const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (ignored.has(entry.name)) return [];
  const fullPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(fullPath);
  return entry.name.endsWith('.js') ? [fullPath] : [];
});

for (const file of walk(root)) {
  try {
    parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  } catch (error) {
    failures.push(`${path.relative(root, file)}: ${error.message}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
if (pkg.version !== app.version) failures.push(`Versiones distintas: package.json=${pkg.version}, app.json=${app.version}`);
if (pkg.version !== app.extra?.updateVersion) failures.push(`Versión OTA distinta: package.json=${pkg.version}, updateVersion=${app.extra?.updateVersion}`);

const duplicates = values => values.filter((value, index) => values.indexOf(value) !== index);
const duplicatePermissions = duplicates(app.android?.permissions || []);
const duplicateArchitectures = duplicates(app.android?.architectures || []);
if (duplicatePermissions.length) failures.push(`Permisos Android duplicados: ${[...new Set(duplicatePermissions)].join(', ')}`);
if (duplicateArchitectures.length) failures.push(`Arquitecturas Android duplicadas: ${[...new Set(duplicateArchitectures)].join(', ')}`);

if (failures.length) {
  console.error(`Validación fallida (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validación correcta: ${walk(root).length} archivos JS y configuración ${pkg.version}.`);

