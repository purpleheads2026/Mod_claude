# Mod_claude — overview

Mod (plugin di function hooks) per l'interfaccia di Claude Code. Il primo è **Regia**:
una sala di controllo grafica della sessione — agenti al lavoro, skill caricate,
strumenti usati, contesto/costo/rate limit — dentro un pannello del Code tab.

## Dove vive il codice

| Copia | Percorso | Ruolo |
| --- | --- | --- |
| **Installata (fonte)** | `regia/` (questa repo) | Plugin `regia@mod-claude`, scope utente, nel profilo di configurazione (`$CLAUDE_CONFIG_DIR`, di default `~/.claude`). Il marketplace è questa cartella e l'engine legge il plugin **direttamente da qui** (`claude plugin list` → `Read from:`): si modifica qui, poi `/reload-plugins` nelle sessioni aperte. Le sessioni nuove lo caricano da sole. |
| Sviluppo storico | `$CLAUDE_CONFIG_DIR/dev-mods/<session-id>/regia/` | Copia con hot reload della sola sessione in cui è nato il mod. In quella sessione non lanciare `/reload-plugins`: due copie con lo stesso nome scriverebbero lo stesso stato e conterebbero tutto due volte. `scripts/sync.sh` la riporta nella repo. |

## Struttura della repo

```
Mod_claude/
├── overview.md                      questa mappa
├── README.md                        vetrina in inglese: hero animato, monitor, anatomia, install
├── design-tokens.json               token della pagina Pages e delle immagini (base: regia/design-tokens.json)
├── docs/                            GitHub Pages (pubblicata da main /docs)
│   ├── index.html                   landing in inglese con demo live EN/IT (scritta a mano)
│   ├── demo/lib/*.mjs               generata: hooks convertiti + scenario, usati dalla demo
│   └── media/{hero,wall,anatomy}.svg  generate: immagini animate del README
├── .claude-plugin/marketplace.json  rende la repo un marketplace (plugin: regia → ./regia)
├── .claude/launch.json              server statico per l'anteprima (porta 4317)
├── .gitignore                       esclude tipi generati dall'engine e output anteprima
├── scripts/sync.sh                  dev-mods → regia/
├── scripts/showcase.mjs             rigenera docs/demo/lib e docs/media dai sorgenti del plugin
└── regia/
    ├── .claude-plugin/plugin.json   manifest (nome, versione, contratto dei tipi)
    ├── design-tokens.json           token congelati: colori hex, tipografia, motion, raggi
    ├── hooks/hooks.json             punta al modulo degli hook
    ├── hooks/register.tsx           cablaggio eventi → stato → render del pannello
    ├── hooks/model.ts               riduttori puri dello stato (nessun $, testabili)
    ├── hooks/i18n.ts                tutti i testi del pannello, inglese (default) e italiano
    ├── hooks/motion.ts              keyframes, curve, durate, fase agganciata all'orologio
    ├── hooks/radar.ts               il monitor principale: nucleo, satelliti, corona dei 60 s
    ├── hooks/svg.ts                 token, utilità e gli altri monitor
    ├── types/index.d.ts             contratto di $.state (PluginState['regia'])
    ├── tests/regia.test.ts          test con `claude plugin test`
    ├── preview/build.mjs            hooks/*.ts → preview/.cache/*.mjs, scrive index.html e live.html
    └── preview/scenario.mjs         scenario finto (statico) e simulatore di sessione (live)
```

### Come si collegano

1. `register.tsx` ascolta gli eventi dell'engine:
   `tool.call` (ogni strumento, anche dei subagenti via `agentId`), `agent.spawn`
   (nascita subagente), `turn.start` / `turn.complete` (turni principali e fine dei
   subagenti), `skill.prompt` (ogni skill caricata: slash, Skill tool, preload),
   `session.measure` (contesto, rate limit, costo; poi `$.session.usage` per la
   composizione del contesto), `session.end` (reset su /clear).
2. Ogni evento passa da un riduttore di `model.ts` e scrive l'atom `regia.snap`
   in `$.state` (sopravvive agli hot reload, non alle nuove sessioni).
3. Il render del pannello (`ui.render` su `Pane`, id `regia`) legge lo snapshot:
   - superfici con `Svg` (desktop, vscode, mobile) → la parete di monitor:
     **radar** (`radar.ts`: nucleo con stato, cronometro e anello del contesto;
     subagenti in orbita come satelliti con monogramma e fasci di pacchetti; corona
     degli ultimi 60 s di strumenti, una traccia per operatore, che ruota alla velocità
     del tempo), poi da `svg.ts`: strumentazione (contesto, costo, token, composizione,
     limiti), agenti (schede con lo stesso monogramma del radar), skill, attività
     (corsie che scorrono col tempo), strumenti, file toccati;
   - terminale → versione testuale compatta con `Box`/`Text`.
   Tutti i monitor sono immagini (`Svg` senza `isInteractive`): sul desktop un Svg
   interattivo finisce in un iframe alto 150 px che rimpicciolisce l'SVG (visto su uno
   screenshot reale), e si ricaricherebbe a ogni cambio di sorgente. Quindi niente
   tooltip come unica fonte di un dato.
   La riga del prompt mostra il testo della persona; le notifiche interne che arrivano
   come turno (`<agent-message>`, `<task-notification>`, comandi) diventano un'etichetta
   "↳ …" (`promptLabel` in `model.ts`).
4. Un timer (`$.clock.every`, avviato in `session.start`) aggiorna `regia.now` ogni
   secondo solo mentre qualcosa lavora; ogni 3 battiti riallinea gli stati con
   `$.agent.list()`.
5. Motion (`motion.ts`): ogni ridisegno sostituisce il documento SVG, quindi ogni
   animazione è agganciata all'orologio reale con `animation-delay` negativo
   (`since(età dell'evento)`, `phase(ora, periodo)`): entrate già finite restano finite,
   cicli e rotazione proseguono senza scatti. Regole verificate sul rendering come
   immagine in Chrome: keyframes con `from` esplicito, niente `transform-origin` in px
   né attributo `transform` su elementi animati in transform.
6. `preview/build.mjs` converte `hooks/*.ts` con il type stripping di Node (nessuna
   dipendenza) e scrive `preview/index.html` (statica) e `preview/live.html` (sessione
   simulata, ridisegno ogni secondo come sul desktop: è lì che si verifica il motion).

## Lingua

Opzione `language` del manifest (`userConfig`, valori `en`/`it`, default `en`). Il valore
sta in `pluginConfigs` delle impostazioni (`regia@mod-claude` per il plugin installato,
`regia` / `regia@inline` per una copia in sviluppo). Sul profilo di Samuel è impostato `it`.
`register.tsx` sceglie `STRINGS[lang]` a ogni load; nessun testo è scritto nei monitor.
Le notifiche interne nel prompt sono salvate come chiave (`↳agent-message`) e tradotte al
disegno.

## Comandi

- `/regia` — apre (o riporta in primo piano) il pannello. Si apre anche da solo a
  inizio sessione se c'è spazio.
- Nel pannello: **Compatta/Espandi**, **Azzera statistiche**.
- Status line: "Regia · N agenti in corso" mentre lavorano dei subagenti.

## Sviluppo, verifica, pubblicazione

La `claude` nel PATH (`~/.local/bin/claude`, 2.1.233) è più vecchia dell'engine del
desktop e non capisce i moduli di hook: per validare e testare usa il binario del
desktop (2.1.293 al momento):

```bash
# il binario che usa l'app desktop (su macOS sotto ~/Library/Application Support/Claude/claude-code/<versione>/)
CC="$HOME/Library/Application Support/Claude/claude-code/<versione>/<build>/claude.app/Contents/MacOS/claude"
"$CC" plugin validate regia      # manifest + modulo come li legge l'engine
"$CC" plugin test regia          # test in tests/
node regia/preview/build.mjs     # anteprima → regia/preview/{index,live}.html (server: .claude/launch.json)
```

Regole da ricordare:
- `$` si passa solo a funzioni dichiarate al livello superiore del modulo (per questo
  `tick` e `refreshStatus` stanno fuori da `register`).
- **Il render è deterministico**: l'"ora" del disegno è `max(battito del timer,
  latestStamp(stato))`, mai `$.clock.now()`. Lo scroll del pannello è gestito
  dall'engine e ogni scroll ridisegna: se il ridisegno cambiasse gli SVG, il desktop
  sostituirebbe le immagini, l'altezza oscillerebbe e lo scroll andrebbe in loop
  (+1/−1 riga all'infinito, bug misurato il 2026-10-10 con una sonda).

Installazione (già fatta il 2026-10-10), dalla root della repo, con il binario del desktop e lo stesso `CLAUDE_CONFIG_DIR` dell'app:

```bash
"$CC" plugin marketplace add "$PWD"
"$CC" plugin install regia@mod-claude --scope user
```

Vetrina GitHub: `node scripts/showcase.mjs` rigenera immagini del README e moduli della demo
(Pages pubblica `main` /docs: https://purpleheads2026.github.io/Mod_claude/). Server locale:
configurazione `regia-docs` in `.claude/launch.json` (porta 4318).

Aggiornare: modificare `regia/`, alzare `version` in `regia/.claude-plugin/plugin.json`,
poi `/reload-plugins` in ogni sessione aperta. Disinstallare: `"$CC" plugin uninstall regia@mod-claude`.
GitHub: [purpleheads2026/Mod_claude](https://github.com/purpleheads2026/Mod_claude) (pubblica dal 2026-10-10, branch `main`).
Installare da lì su un'altra macchina, da terminale:
`/plugin install regia --marketplace purpleheads2026/Mod_claude`.

## Design

Direzione "sala regia broadcast": schermi grafite `#15171B`, inchiostro caldo
`#F1EEE6`, in corso ambra `#fab219`, fatto verde `#0ca30c`, errore `#d03b3b`.
Categorie strumenti: palette categoriale scura validata (dataviz, ordine fisso).
Tipografia: DIN Alternate per i numeri, ui-monospace (SF Mono) per le label.
Tutti i valori sono in `regia/design-tokens.json`.
