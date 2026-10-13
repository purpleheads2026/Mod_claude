# Mod Regia — Mod_claude

## Fronte

- **Cosa è**: Regia, plugin di Claude Code (pannello grafico della sessione: agenti, skill,
  strumenti, contesto, limiti), con la sua vetrina pubblica in inglese (README e GitHub Pages
  da `docs/`). Per chi usa Claude Code desktop.
- **Percorsi**: `.` (fronte unico, tabella in `overview.md`).
- **Stato del lavoro**: `STATO.md` qui accanto. Leggilo a inizio sessione, aggiornalo a fine
  blocco di lavoro.

## Come si lavora qui

- **Avvio sessione**: nessuno; leggere `overview.md` e `STATO.md`.
- **Skill da usare**: `plugin-authoring` (hook, pannello, test), `dataviz` e `animate` per i
  monitor, `design-system-guardrails` per `docs/`, subagent `design-reviewer` dopo ogni modifica
  UI, `pre-delivery-gate` prima del push.
- **Comandi** (dettagli in `overview.md`, "Sviluppo, verifica, pubblicazione"):
  validazione `"$CC" plugin validate regia` · test `"$CC" plugin test regia` ·
  anteprima `node regia/preview/build.mjs` · vetrina `node scripts/showcase.mjs`.
  `$CC` è il `claude` dell'app desktop: quello nel PATH è troppo vecchio.
- **Commit**: messaggi in inglese come il resto della storia; con un fronte solo niente prefisso.

## Regole specifiche

- `regia/` è la fonte. `docs/demo/lib/` e `docs/media/` li genera `scripts/showcase.mjs`: mai a
  mano. `docs/index.html` è scritto a mano.
- Una modifica a `regia/hooks/` va con: `version` alzata in `regia/.claude-plugin/plugin.json`,
  test verdi, `node scripts/showcase.mjs`, un commit solo per plugin e vetrina.
- Le sessioni non leggono `regia/`: caricano una copia in cache, anche se `claude plugin list`
  dice `Read from: …/regia`. Dopo ogni release va aggiornata in ogni profilo con
  `claude plugin update regia@mod-claude` (binario del desktop di quel profilo), poi
  `/reload-plugins`. Purpleheads prende la versione dalla cartella (scope user e project sulla
  home), Aldeia da GitHub (serve prima il push).
- Render deterministico e regole del motion SVG: `overview.md`, "Come si collegano" punto 5 e
  "Regole da ricordare". Non derogare: il bug dello scroll infinito nasce da lì.
- Tutti i testi del pannello stanno in `regia/hooks/i18n.ts` (en default, it). Vetrina in inglese.
- Repo di purpleheads (`purpleheads2026`, remote `git@github-purpleheads:…`), pubblica: niente
  percorsi personali nei file versionati.
- `scripts/sync.sh` fa `rsync --delete` verso `regia/`: lanciarlo solo con `git status` pulito.
