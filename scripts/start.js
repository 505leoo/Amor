const { spawn, execSync } = require('child_process');
const os = require('os');

const ip = Object.values(os.networkInterfaces())
  .flat()
  .find(i => i.family === 'IPv4' && !i.internal)?.address;

if (!ip) { console.error('No se encontró IP local'); process.exit(1); }

console.log(`› IP detectada: ${ip}`);

spawn('npx', ['expo', 'start', '--dev-client'], {
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: ip },
  stdio: 'inherit',
  shell: true,
});

const abrirApp = () => {
  const url = `exp+amor://expo-development-client/?url=http%3A%2F%2F${ip}%3A8081`;
  const devices = execSync('adb devices', { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .filter(l => l.includes('\tdevice'))
    .map(l => l.split('\t')[0]);

  if (!devices.length) { console.error('› No hay dispositivos conectados'); return; }

  devices.forEach(device => {
    try {
      execSync(`adb -s ${device} shell am start -a android.intent.action.VIEW -d "${url}" com.leitof7.amor`, { encoding: 'utf8' });
      console.log(`› Conectado: ${device}`);
    } catch (e) {
      console.error(`› Error en ${device}: ${e.message}`);
    }
  });
};

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString().toLowerCase() === 'a') {
      console.log('› Abriendo app...');
      abrirApp();
    }
    if (key.toString() === '\u0003') process.exit(); // Ctrl+C
  });
  console.log('› Presiona A para abrir la app en el dispositivo');
}

