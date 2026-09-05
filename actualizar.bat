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

set "DRY=0"
if /I "%1"=="--dry" set "DRY=1"
if /I "%2"=="--dry" set "DRY=1"
if /I "%1"=="build" goto build
if "!DRY!"=="1" goto dry
npm run actualizar:hotfix %*
exit /b %ERRORLEVEL%

:dry
npm run actualizar:hotfix -- --no-commit --no-push --no-publish
exit /b %ERRORLEVEL%

:build
if "!DRY!"=="1" npm run actualizar:sync -- --no-commit --no-push --no-publish
if "!DRY!"=="0" npm run actualizar:sync
if not "%ERRORLEVEL%"=="0" exit /b %ERRORLEVEL%
eas build -p android --profile production
exit /b %ERRORLEVEL%

:missing
echo Falta el token de la cuenta elegida. Configuralo con setx EAS_TOKEN_AMOR "TU_TOKEN_DE_505LEOO" o setx EAS_TOKEN_LOVEWEB "TU_TOKEN_DE_LEITOF7"
exit /b 1
