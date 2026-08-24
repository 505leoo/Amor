#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

function bumpVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3) throw new Error('Version must be semver-like MAJOR.MINOR.PATCH');
  let [major, minor, patch] = parts;

  // increment patch
  patch += 1;
  if (patch > 99) {
    patch = 0;
    minor += 1;
  }
  if (minor > 99) {
    minor = 0;
    major += 1;
  }

  return [major, minor, patch].join('.');
}

function run() {
  try {
    // stage all changes
    execSync('git add .', { stdio: 'inherit' });

    const pkgPath = 'package.json';
    const appJsonPath = 'app.json';

    const pkg = readJSON(pkgPath);
    const currentVersion = pkg.version;
    const newVersion = bumpVersion(currentVersion);

    // update package.json
    pkg.version = newVersion;
    writeJSON(pkgPath, pkg);

    // handle runtimeVersion syncing behavior (opt-in for safety)
    // By default we DO NOT change app.json.runtimeVersion. Use --sync-runtime to sync to newVersion,
    // or --runtime <ver> to set an explicit runtime, or --use-app-runtime to publish using the runtime already in app.json.
    const syncRuntime = process.argv.includes('--sync-runtime') || process.argv.includes('--sync');
    const runtimeArgIndex = process.argv.indexOf('--runtime');
    let explicitRuntime = (runtimeArgIndex !== -1 && process.argv[runtimeArgIndex + 1]) ? process.argv[runtimeArgIndex + 1] : null;
    const useAppRuntime = process.argv.includes('--use-app-runtime');

    if (fs.existsSync(appJsonPath)) {
      const app = readJSON(appJsonPath);
      if (app.expo) {
        // Mantiene alineadas la versión visible del binario y la que mostramos
        // dentro de la app. runtimeVersion continúa siendo independiente.
        app.expo.version = newVersion;
        // Este dato viaja dentro del manifiesto OTA y permite que la versión
        // instalada muestre qué versión nueva está disponible antes de bajarla.
        app.expo.extra = app.expo.extra || {};
        app.expo.extra.updateVersion = newVersion;

        if (useAppRuntime) {
          // Publish using the runtime already in app.json
          explicitRuntime = app.expo.runtimeVersion || explicitRuntime;
          
        }

        if (explicitRuntime) {
          app.expo.runtimeVersion = explicitRuntime;
          writeJSON(appJsonPath, app);
          console.log(`Set app.json runtimeVersion -> ${explicitRuntime} (from --runtime or --use-app-runtime)`);
        } else if (syncRuntime) {
          app.expo.runtimeVersion = newVersion;
          writeJSON(appJsonPath, app);
          console.log(`Synced app.json runtimeVersion -> ${newVersion} (from --sync-runtime)`);
        } else {
          console.log('Not modifying app.json.runtimeVersion (default safe behavior). Use --sync-runtime or --runtime to change it.');
          writeJSON(appJsonPath, app);
        }
      }
    }

    // El primer git add ocurre antes del cambio de versión; añadimos estos
    // archivos otra vez para que el commit publicado incluya los números nuevos.
    execSync('git add package.json app.json', { stdio: 'inherit' });

    // commit the version bump (unless --no-commit)
    const noCommit = process.argv.includes('--no-commit');
    if (!noCommit) {
      execSync(`git commit -m "${newVersion}"`, { stdio: 'inherit' });
    } else {
      console.log('Skipping git commit (--no-commit)');
    }

    // Optional: push the current branch unless --no-push is provided
    const noPush = process.argv.includes('--no-push');
    if (!noPush) {
      try {
        console.log(`Pushing commit (git push)...`);
        execSync('git push', { stdio: 'inherit' });
        
      } catch (pushErr) {
        console.error('git push failed:', pushErr.message);
        process.exit(1);
      }
    } else {
      console.log('Skipping git push (--no-push)');
    }

    // Optional: publish an EAS Update unless --no-publish is provided
    const noPublish = process.argv.includes('--no-publish');
    if (!noPublish) {
      try {
        // Este comando publica siempre la actualización normal de Android.
        // --environment evita que las versiones recientes de EAS pregunten
        // entre production, preview y development; --non-interactive impide
        // que una publicación automática quede esperando una respuesta.
        execSync(
          `eas update --branch production --environment production --message "${newVersion}" --platform android --non-interactive`,
          { stdio: 'inherit' },
        );
      } catch (pubErr) {
        console.error('eas update failed:', pubErr.message);
        process.exit(1);
      }
    } else {
      console.log('Skipping eas update (--no-publish)');
    }

  } catch (err) {
    console.error('Failed to run actualizar:', err.message);
    process.exit(1);
  }
}

run();

