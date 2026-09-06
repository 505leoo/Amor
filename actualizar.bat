@echo off
setlocal EnableDelayedExpansion

REM Amor usa EAS 505leoo; LoveWeb usa EAS Leitof7.
echo Elegi la cuenta EAS para Amor:
echo [1] 505leoo (Amor)
echo [2] Leitof7 (LoveWeb)
choice /C 12 /N /M "Cuenta: "
if errorlevel 2 set "EXPO_TOKEN=!EAS_TOKEN_LOVEWEB!"
if errorlevel 1 if not errorlevel 2 set "EXPO_TOKEN=!EAS_TOKEN_AMOR!"
if not defined EXPO_TOKEN goto missing

set "MODE=ota"
if /I "%1"=="build" set "MODE=build"
if /I "%1"=="--dry" goto dry
if "%1"=="" (
  echo.
  echo Que queres publicar?
  echo [1] Actualizacion rapida (OTA)
  echo [2] Nueva instalacion (build de produccion)
  choice /C 12 /N /M "Operacion: "
  if errorlevel 2 set "MODE=build"
)

echo Verificando acceso EAS...
call eas whoami
if errorlevel 1 goto invalidToken

if "!MODE!"=="build" goto build
call npm run actualizar:hotfix %*
exit /b %ERRORLEVEL%

:dry
call npm run actualizar:hotfix -- --no-commit --no-push --no-publish
exit /b %ERRORLEVEL%

:build
call node .\scripts\preparar-runtime.js
if errorlevel 1 exit /b %ERRORLEVEL%
call eas build -p android --profile production --non-interactive --json > .eas-build-result.json
if errorlevel 1 goto buildFailed
call node .\scripts\confirmar-runtime.js
call node .\scripts\registrar-production.js
if errorlevel 1 goto syncFailed
del /q .eas-build-result.json >nul 2>&1
echo Nueva instalacion y runtime publicados correctamente.
exit /b 0

:missing
echo Falta el token de la cuenta elegida. Configuralo con setx EAS_TOKEN_AMOR "TU_TOKEN_DE_505LEOO" o setx EAS_TOKEN_LOVEWEB "TU_TOKEN_DE_LEITOF7"
exit /b 1

:invalidToken
echo El token de la cuenta elegida es invalido o fue revocado. Genera uno nuevo en Expo y vuelve a guardarlo.
pause
exit /b 1

:buildFailed
call node .\scripts\restaurar-runtime.js
del /q .eas-build-result.json >nul 2>&1
echo La build de produccion fallo. El runtime no se registro en Firestore.
exit /b 1

:syncFailed
echo La build termino, pero el runtime no pudo sincronizarse con Firestore.
exit /b 1
