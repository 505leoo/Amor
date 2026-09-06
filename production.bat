@echo off
setlocal EnableDelayedExpansion

REM Amor usa EAS 505leoo; LoveWeb usa EAS Leitof7.
echo Elegi la cuenta EAS para la build de produccion de Amor:
echo [1] 505leoo (Amor)
echo [2] Leitof7 (LoveWeb)
choice /C 12 /N /M "Cuenta: "
if errorlevel 2 set "EXPO_TOKEN=!EAS_TOKEN_LOVEWEB!"
if errorlevel 1 if not errorlevel 2 set "EXPO_TOKEN=!EAS_TOKEN_AMOR!"
if not defined EXPO_TOKEN goto missing

echo Verificando acceso EAS...
call eas whoami
if errorlevel 1 goto invalidToken

echo Creando build Android de produccion...
call eas build --platform android --profile production --non-interactive
if errorlevel 1 goto buildFailed

echo Build terminada. Sincronizando runtime con Love System...
call node .\scripts\registrar-runtime.js
if errorlevel 1 goto syncFailed

echo Produccion finalizada correctamente.
exit /b 0

:missing
echo Falta el token de la cuenta elegida. Configuralo con setx EAS_TOKEN_AMOR "TU_TOKEN_DE_505LEOO" o setx EAS_TOKEN_LOVEWEB "TU_TOKEN_DE_LEITOF7"
exit /b 1

:invalidToken
echo El token de la cuenta elegida es invalido o fue revocado.
exit /b 1

:buildFailed
echo La build de produccion fallo. No se modifico el runtime en Firestore.
exit /b 1

:syncFailed
echo La build termino, pero el runtime no pudo sincronizarse con Firestore.
exit /b 1
