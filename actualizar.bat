@echo off
REM Helper to run actualizar flows on Windows. Usage:
REM actualizar           -> runs hotfix (use app.json runtime)
REM actualizar build     -> sync runtime to package.json version and build (eas build)

@echo off
setlocal enabledelayedexpansion

REM parse --dry flag (only if there are args)
set DRY=0
if not "%*"=="" (
  for %%A in (%*) do (
    if /I "%%~A"=="--dry" set DRY=1
  )
)

IF "%1"=="build" (
  echo [actualizar build] running sync + publish (or dry-run)...
  if "%DRY%"=="1" (
    npm run actualizar:sync -- --no-commit --no-push --no-publish
  ) else (
    npm run actualizar:sync
  )
  if %ERRORLEVEL% neq 0 (
    echo [actualizar] actualizar:sync failed.
    exit /b %ERRORLEVEL%
  )
  echo [actualizar build] starting eas build for android (profile: production)...
  eas build -p android --profile production
  exit /b %ERRORLEVEL%
)

REM default: hotfix using app.json runtime
if "%DRY%"=="1" (
  echo [actualizar] running hotfix (dry) using app.json runtime...
  npm run actualizar:hotfix -- --no-commit --no-push --no-publish
) else (
  echo [actualizar] running hotfix using app.json runtime...
  npm run actualizar:hotfix %*
)

endlocal
