const fs = require('fs');
const { execSync } = require('child_process');

function updateVersion() {
  try {
    // Obtener archivos cambiados desde el último commit
    const changedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim() !== '');

    
    
    // Leer package.json actual
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    let newVersion;
    
    if (changedFiles.length >= 5) {
      // Más de 5 archivos: incrementar minor (segundo número)
      newVersion = `${major}.${minor + 1}.0`;
    } else if (changedFiles.length >= 2) {
      // Más de 2 archivos: incrementar patch (tercer número)
      newVersion = `${major}.${minor}.${patch + 1}`;
    } else {
      // Menos de 2 archivos: mantener versión
      newVersion = currentVersion;
    }

    // Actualizar package.json
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    // También sincronizar runtimeVersion en app.json si existe
    try {
      const appConfigPath = 'app.json';
      if (fs.existsSync(appConfigPath)) {
        const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
        if (appConfig.expo) {
          appConfig.expo.runtimeVersion = newVersion;
          fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2));
          
        }
      }
    } catch (e) {
      
    }

    
    
  } catch (error) {
    
    // Si hay error, mantener versión actual
  }
}

updateVersion();
