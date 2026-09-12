#!/usr/bin/env bash
set -euo pipefail

# Configura EAS_TOKEN_AMOR en tu sesión antes de ejecutar este script.
EAS_TOKEN_AMOR="${EAS_TOKEN_AMOR:-}"

if [[ -z "$EAS_TOKEN_AMOR" ]]; then
  echo "Falta configurar EAS_TOKEN_AMOR en la sesión actual."
  echo "Ejemplo: export EAS_TOKEN_AMOR='tu_token'; ./Linux/actualizar-linux.sh"
  exit 1
fi

export EXPO_TOKEN="$EAS_TOKEN_AMOR"
MESSAGE="${1:-Show crash error details}"

echo "Verificando acceso EAS..."
npx eas-cli@22.4.0 whoami

echo "Publicando actualización en production..."
npx eas-cli@22.4.0 update \
  --branch production \
  --environment production \
  --message "$MESSAGE" \
  --platform android \
  --non-interactive \
  --no-bytecode
