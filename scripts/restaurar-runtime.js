#!/usr/bin/env node
const fs = require('fs');

const backupPath = '.runtime-version-backup.json';
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, 'app.json');
  fs.unlinkSync(backupPath);
  console.log('Runtime anterior restaurado.');
}
