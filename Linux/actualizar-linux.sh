#!/usr/bin/env bash
set -euo pipefail

# Pega tu token EAS entre las comillas. No compartas ni publiques este archivo
# después de agregar el token.
EAS_TOKEN_AMOR="${EAS_TOKEN_AMOR:-PEGA_AQUI_TU_TOKEN_EAS}"

if [[ "$EAS_TOKEN_AMOR" == "PEGA_AQUI_TU_TOKEN_EAS" ]]; then
  echo "Falta configurar EAS_TOKEN_AMOR en actualizar-linux.sh."
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
