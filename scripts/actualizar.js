#!/usr/bin/env node
const fs = require('fs');
const { spawnSync } = require('child_process');
const readline = require('readline');

const PROGRESS_PATH = '.actualizar-progress.json';
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const COMMAND_TIMEOUTS = {
  git: 2 * 60 * 1000,
  push: 3 * 60 * 1000,
  easUpdate: 10 * 60 * 1000,
};

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function argumentosActuales() {
  const runtimeArgIndex = process.argv.indexOf('--runtime');
  return {
    noCommit: process.argv.includes('--no-commit'),
    noPush: process.argv.includes('--no-push'),
    noPublish: process.argv.includes('--no-publish'),
    noNotify: process.argv.includes('--no-notify'),
    noSystemSync: process.argv.includes('--no-system-sync'),
    syncRuntime: process.argv.includes('--sync-runtime') || process.argv.includes('--sync'),
    useAppRuntime: process.argv.includes('--use-app-runtime'),
    runtime: runtimeArgIndex !== -1 && process.argv[runtimeArgIndex + 1]
      ? process.argv[runtimeArgIndex + 1]
      : null,
  };
}

function cargarProgreso() {
  if (!fs.existsSync(PROGRESS_PATH)) return null;
  try {
    const progreso = readJSON(PROGRESS_PATH);
    if (!progreso?.newVersion || !progreso?.stage || !progreso?.options) {
      throw new Error('formato incompleto');
    }
    return progreso;
  } catch (error) {
    throw new Error(`Existe ${PROGRESS_PATH}, pero no se pudo leer: ${error.message}`);
  }
}

function guardarProgreso(progreso) {
  writeJSON(PROGRESS_PATH, {
    ...progreso,
    updatedAt: new Date().toISOString(),
  });
}

function borrarProgreso() {
  if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH);
}

function describirError(error, timeoutMs) {
  if (error?.timedOut) return `superó el límite de ${Math.round(timeoutMs / 1000)} segundos`;
  return error?.message || 'falló sin devolver un mensaje';
}

function ejecutarComando(comando, argumentos, timeoutMs) {
  const esWindows = process.platform === 'win32';
  let ejecutable = comando;
  let argumentosFinales = argumentos;
  if (esWindows && comando === 'eas') {
    // eas se instala como .cmd en Windows. Ejecutarlo a través de cmd evita
    // que spawnSync falle con EINVAL y permite aplicar el timeout del proceso.
    ejecutable = process.env.ComSpec || 'cmd.exe';
    const argumentosEas = argumentos.map(argumento => `"${String(argumento).replace(/"/g, '\\"')}"`);
    argumentosFinales = ['/d', '/s', '/c', ['eas', ...argumentosEas].join(' ')];
  }

  const resultado = spawnSync(ejecutable, argumentosFinales, {
    stdio: 'inherit',
    timeout: timeoutMs,
    windowsHide: false,
    shell: false,
  });

  if (resultado.error || resultado.status !== 0) {
    const error = resultado.error || new Error(`terminó con código ${resultado.status}`);
    if (resultado.error?.code === 'ETIMEDOUT' || resultado.signal) error.timedOut = true;
    throw error;
  }
}

function ejecutarCaptura(comando, argumentos) {
  const resultado = spawnSync(comando, argumentos, { encoding: 'utf8', windowsHide: true });
  if (resultado.status !== 0) return '';
  return String(resultado.stdout || '').trim();
}

function ejecutarConReintentos(nombre, comando, argumentos, timeoutMs = COMMAND_TIMEOUTS.git) {
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_ATTEMPTS; intento += 1) {
    try {
      console.log(`[${nombre}] intento ${intento}/${MAX_ATTEMPTS}...`);
      ejecutarComando(comando, argumentos, timeoutMs);
      console.log(`[${nombre}] completado.`);
      return;
    } catch (error) {
      ultimoError = error;
      console.warn(`[${nombre}] ${describirError(error, timeoutMs)}.`);
      if (intento < MAX_ATTEMPTS) console.log(`[${nombre}] reintentando desde este paso...`);
    }
  }
  throw new Error(`${nombre} no pudo completarse después de ${MAX_ATTEMPTS} intentos: ${describirError(ultimoError, timeoutMs)}`);
}

async function ejecutarAsyncConReintentos(nombre, accion, timeoutMs) {
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_ATTEMPTS; intento += 1) {
    try {
      console.log(`[${nombre}] intento ${intento}/${MAX_ATTEMPTS}...`);
      let temporizador;
      const operacion = Promise.resolve().then(accion);
      const limite = new Promise((_, reject) => {
        temporizador = setTimeout(() => reject(new Error(`superó el límite de ${Math.round(timeoutMs / 1000)} segundos`)), timeoutMs);
      });
      let resultado;
      try {
        resultado = await Promise.race([operacion, limite]);
      } finally {
        clearTimeout(temporizador);
      }
      console.log(`[${nombre}] completado.`);
      return resultado;
    } catch (error) {
      ultimoError = error;
      console.warn(`[${nombre}] ${error.message || error}.`);
      if (intento < MAX_ATTEMPTS) {
        console.log(`[${nombre}] reintentando desde este paso...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw new Error(`${nombre} no pudo completarse después de ${MAX_ATTEMPTS} intentos: ${ultimoError?.message || ultimoError}`);
}

let adminFirestore = null;
function getAdminFirestore() {
  if (adminFirestore) return adminFirestore;
  const admin = require('../functions/node_modules/firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ projectId: 'amor-9df0d' });
  adminFirestore = admin.firestore();
  adminFirestore.settings({ preferRest: true });
  return adminFirestore;
}

function pedirResumen() {
  const summaryArg = process.argv.indexOf('--summary');
  if (summaryArg !== -1 && process.argv[summaryArg + 1]) return Promise.resolve(process.argv.slice(summaryArg + 1).join(' '));
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.resolve('Nuevas mejoras y detalles preparados con mucho cariño para Amor.');
  }
  const interfaz = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => interfaz.question('Resumen de esta actualización: ', respuesta => {
    interfaz.close();
    resolve(respuesta.trim() || 'Nuevas mejoras y detalles preparados con mucho cariño para Amor.');
  }));
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

function androidVersionCode(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 99)) {
    throw new Error(`No se pudo convertir ${version} a un versionCode Android válido.`);
  }

  // Mantiene el orden de las versiones semver dentro del límite de Android.
  const [major, minor, patch] = parts;
  const code = major * 10000 + minor * 100 + patch;
  if (!Number.isSafeInteger(code) || code < 1 || code > 2100000000) {
    throw new Error(`El versionCode calculado para ${version} no es válido: ${code}.`);
  }
  return code;
}

function sincronizarVersionAndroid(version) {
  const gradlePath = 'android/app/build.gradle';
  if (!fs.existsSync(gradlePath)) {
    console.warn('No se encontró android/app/build.gradle; se omite la sincronización nativa.');
    return;
  }

  const versionCode = androidVersionCode(version);
  const original = fs.readFileSync(gradlePath, 'utf8');
  const versionCodeActual = original.match(/\bversionCode\s+(\d+)/)?.[1];
  const versionNameActual = original.match(/\bversionName\s+["'](.*?)["']/)?.[1];
  if (versionCodeActual === String(versionCode) && versionNameActual === version) {
    console.log(`Android ya estaba sincronizado: versionName ${version}, versionCode ${versionCode}`);
    return;
  }

  const actualizado = original
    .replace(/(\bversionCode\s+)\d+/, `$1${versionCode}`)
    .replace(/(\bversionName\s+)(["']).*?\2/, `$1"${version}"`);

  if (actualizado === original) {
    throw new Error('No se encontraron versionCode y versionName en android/app/build.gradle.');
  }

  fs.writeFileSync(gradlePath, actualizado);
  console.log(`Android sincronizado: versionName ${version}, versionCode ${versionCode}`);
}

async function notificarActualizacion(version, resumen) {
  const admin = require('../functions/node_modules/firebase-admin');
  const ref = getAdminFirestore().collection('notificaciones').doc('notificacion_1_actualizacion');
  await ref.set({
    nombre: 'Notificación 1',
    titulo: 'Una nueva actualización llegó a Amor',
    mensaje: resumen,
    descripcion: resumen,
    resumen,
    enviar: 'si',
    vibrar: true,
    version,
    solicitadaEn: admin.firestore.FieldValue.serverTimestamp(),
    actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function sincronizarLoveSystem(version, resumen) {
  const admin = require('../functions/node_modules/firebase-admin');
  const db = getAdminFirestore();
  await db.collection('actualizaciones').doc('amor').set({
    appId: 'amor',
    otaVersion: version,
    otaDescription: resumen,
    otaUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedBy: 'Amor',
  }, { merge: true });
}

function commitVersion(newVersion, noCommit) {
  if (noCommit) {
    console.log('Skipping git commit (--no-commit)');
    return;
  }

  const staged = spawnSync('git', ['diff', '--cached', '--quiet'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  if (staged.status === 0) {
    const ultimoCommit = ejecutarCaptura('git', ['log', '-1', '--pretty=%s']);
    if (ultimoCommit === newVersion) {
      console.log(`El commit ${newVersion} ya existía; se continúa desde el siguiente paso.`);
      return;
    }
    throw new Error('No hay cambios preparados para crear el commit de la actualización.');
  }

  ejecutarConReintentos('git commit', 'git', ['commit', '-m', newVersion], COMMAND_TIMEOUTS.git);
}

function pushConReintentos() {
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_ATTEMPTS; intento += 1) {
    console.log(`[git push] intento ${intento}/${MAX_ATTEMPTS}...`);
    try {
      ejecutarComando('git', ['push'], COMMAND_TIMEOUTS.push);
      console.log('[git push] completado.');
      return;
    } catch (error) {
      ultimoError = error;
      console.warn(`[git push] ${describirError(error, COMMAND_TIMEOUTS.push)}.`);
      console.log('[git push] probando HTTP/1.1 desde este mismo paso...');
      try {
        ejecutarComando('git', ['-c', 'http.version=HTTP/1.1', 'push'], COMMAND_TIMEOUTS.push);
        console.log('[git push] completado usando HTTP/1.1.');
        return;
      } catch (fallbackError) {
        ultimoError = fallbackError;
        console.warn(`[git push] HTTP/1.1 ${describirError(fallbackError, COMMAND_TIMEOUTS.push)}.`);
      }
    }
    if (intento < MAX_ATTEMPTS) console.log('[git push] reintentando desde el push...');
  }
  throw new Error(`git push no pudo completarse después de ${MAX_ATTEMPTS} intentos: ${describirError(ultimoError, COMMAND_TIMEOUTS.push)}`);
}

async function run() {
  let progreso = null;
  try {
    const pkgPath = 'package.json';
    const appJsonPath = 'app.json';

    const opcionesActuales = argumentosActuales();
    progreso = cargarProgreso();
    let opciones;
    let newVersion;
    let resumen;

    if (progreso) {
      opciones = progreso.options;
      newVersion = progreso.newVersion;
      resumen = progreso.resumen;
      console.log(`Reanudando actualización ${newVersion} desde el paso "${progreso.stage}".`);
    } else {
      const pkg = readJSON(pkgPath);
      newVersion = bumpVersion(pkg.version);
      resumen = await pedirResumen();
      opciones = opcionesActuales;
      progreso = {
        version: 1,
        newVersion,
        resumen,
        options: opciones,
        stage: 'prepare',
        startedAt: new Date().toISOString(),
      };
      guardarProgreso(progreso);
      console.log(`Resumen guardado para ${newVersion}: ${resumen}`);
    }

    const avanzar = stage => {
      progreso.stage = stage;
      guardarProgreso(progreso);
    };

    if (progreso.stage === 'prepare') {
      const pkg = readJSON(pkgPath);
      pkg.version = newVersion;
      writeJSON(pkgPath, pkg);

      // runtimeVersion solo cambia con --sync-runtime, --runtime o --use-app-runtime.
      const syncRuntime = Boolean(opciones.syncRuntime);
      let explicitRuntime = opciones.runtime || null;
      const useAppRuntime = Boolean(opciones.useAppRuntime);

      if (fs.existsSync(appJsonPath)) {
        const app = readJSON(appJsonPath);
        if (app.expo) {
          app.expo.version = newVersion;
          app.expo.android = app.expo.android || {};
          app.expo.android.versionCode = androidVersionCode(newVersion);
          app.expo.extra = app.expo.extra || {};
          app.expo.extra.updateVersion = newVersion;
          app.expo.extra.updateDescription = resumen;

          if (useAppRuntime) explicitRuntime = app.expo.runtimeVersion || explicitRuntime;
          if (explicitRuntime) {
            app.expo.runtimeVersion = explicitRuntime;
            console.log(`Set app.json runtimeVersion -> ${explicitRuntime} (from --runtime or --use-app-runtime)`);
          } else if (syncRuntime) {
            app.expo.runtimeVersion = newVersion;
            console.log(`Synced app.json runtimeVersion -> ${newVersion} (from --sync-runtime)`);
          } else {
            console.log('Not modifying app.json.runtimeVersion (default safe behavior). Use --sync-runtime or --runtime to change it.');
          }
          writeJSON(appJsonPath, app);
        }
      }

      sincronizarVersionAndroid(newVersion);
      ejecutarConReintentos('git add', 'git', ['add', '.'], COMMAND_TIMEOUTS.git);
      ejecutarConReintentos('git add de versión', 'git', ['add', 'package.json', 'app.json', 'android/app/build.gradle'], COMMAND_TIMEOUTS.git);
      commitVersion(newVersion, Boolean(opciones.noCommit));
      avanzar('push');
    }

    if (progreso.stage === 'push') {
      if (opciones.noPush) console.log('Skipping git push (--no-push)');
      else pushConReintentos();
      avanzar('publish');
    }

    if (progreso.stage === 'publish') {
      if (opciones.noPublish) {
        console.log('Skipping eas update (--no-publish)');
      } else {
        ejecutarConReintentos(
          'eas update',
          'eas',
          ['update', '--branch', 'production', '--environment', 'production', '--message', newVersion, '--platform', 'android', '--non-interactive', '--no-bytecode'],
          COMMAND_TIMEOUTS.easUpdate,
        );
      }
      avanzar('system-sync');
    }

    if (progreso.stage === 'system-sync') {
      if (!opciones.noPublish && !opciones.noSystemSync) {
        await ejecutarAsyncConReintentos('Love System', () => sincronizarLoveSystem(newVersion, resumen), 60 * 1000);
      } else if (opciones.noSystemSync) {
        console.log('Skipping Love System sync (--no-system-sync)');
      }
      avanzar('notify');
    }

    if (progreso.stage === 'notify') {
      if (!opciones.noPublish && !opciones.noNotify) {
        await ejecutarAsyncConReintentos('notificación', () => notificarActualizacion(newVersion, resumen), 60 * 1000);
      } else if (opciones.noNotify) {
        console.log('Skipping update notification (--no-notify)');
      }
      avanzar('done');
    }

    borrarProgreso();
    console.log(`Actualización ${newVersion} completada correctamente.`);

  } catch (err) {
    console.error('Failed to run actualizar:', err.message);
    if (progreso?.stage) {
      console.error(`El progreso quedó guardado en ${PROGRESS_PATH} (paso: ${progreso.stage}).`);
      console.error('Volvé a ejecutar npm run actualizar para reintentar desde ese paso.');
    }
    process.exit(1);
  }
}

run();
