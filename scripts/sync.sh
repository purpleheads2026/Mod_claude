#!/usr/bin/env bash
# Copia il mod dalla cartella di sviluppo (hot reload della sessione) alla repo.
# Uso: scripts/sync.sh [cartella-dev-del-mod]
# Senza argomento prende la più recente $CLAUDE_CONFIG_DIR/dev-mods/*/regia
# (CLAUDE_CONFIG_DIR di default è ~/.claude).
# Esclude ciò che l'engine o l'anteprima rigenerano da soli.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
config="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
src="${1:-$(ls -dt "$config"/dev-mods/*/regia 2>/dev/null | head -1)}"

if [[ -z "$src" || ! -f "$src/.claude-plugin/plugin.json" ]]; then
  echo "Nessun mod 'regia' trovato in dev-mods. Passa il percorso come argomento." >&2
  exit 1
fi

rsync -a --delete \
  --exclude '.claude-plugin/types/' \
  --exclude 'preview/.cache/' \
  --exclude 'preview/index.html' \
  --exclude 'preview/live.html' \
  --exclude 'tsconfig.json' \
  "$src/" "$repo/regia/"

echo "Sincronizzato: $src → $repo/regia"
