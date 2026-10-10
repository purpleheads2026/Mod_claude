# Regia

Una sala di controllo grafica per **Claude Code**: un pannello nel Code tab che mostra in tempo reale cosa sta facendo la sessione.

- **Radar**: al centro la sessione principale, con stato, cronometro del turno e anello del contesto. Intorno girano i subagenti come satelliti, e sulla corona scorrono gli strumenti degli ultimi 60 secondi.
- **Strumentazione**: contesto usato, limite delle 5 ore, token, composizione del contesto, limiti di utilizzo.
- **Agenti**, **skill** caricate, **attività** nel tempo, **strumenti** più usati, **file** toccati.

Il motion è agganciato all'orologio reale: le animazioni non ripartono da capo quando il pannello si ridisegna. Con "riduci movimento" attivo nel sistema restano solo le dissolvenze.

## Requisiti

- Claude Code con il supporto ai mod di function hooks. Regia è testata sulla **2.1.293**; versioni più vecchie, come la 2.1.233, non caricano il modulo degli hook.
- Il pannello grafico compare nel **Code tab dell'app desktop**. Nel terminale c'è una versione testuale compatta.

Per vedere la versione installata:

```bash
claude --version
```

## Installazione

La repo è un marketplace di plugin: il plugin si chiama `regia`, il marketplace `mod-claude`.

### Da GitHub, con il comando nella sessione

In una sessione di Claude Code **da terminale** scrivi:

```
/plugin install regia --marketplace purpleheads2026/Mod_claude
```

Poi:

1. alla domanda **Add marketplace?** rispondi `y`;
2. scegli lo scope **user** (il primo della lista) e premi Invio.

Il comando `/plugin` non è disponibile nel Code tab dell'app desktop. Il plugin installato da terminale con scope user si carica però anche nelle sessioni del desktop, purché usino lo stesso profilo di configurazione: se l'app usa una cartella sua, esporta lo stesso `CLAUDE_CONFIG_DIR` prima di lanciare `claude`.

### Da GitHub, con la CLI

```bash
claude plugin marketplace add purpleheads2026/Mod_claude
```

```bash
claude plugin install regia@mod-claude --scope user
```

### Da una copia locale (consigliato per modificarlo)

```bash
git clone https://github.com/purpleheads2026/Mod_claude.git
```

```bash
claude plugin marketplace add "$PWD/Mod_claude"
```

```bash
claude plugin install regia@mod-claude --scope user
```

Con un marketplace locale Claude Code legge il plugin **direttamente dalla cartella**: dopo un `git pull` o una modifica basta un `/reload-plugins`, senza reinstallare. Per controllare da dove viene letto:

```bash
claude plugin list
```

Accanto a `regia@mod-claude` compare `Read from: <cartella>`.

## Dopo l'installazione

- **Sessioni nuove**: Regia si carica da sola e il pannello si apre all'avvio, se c'è spazio.
- **Sessioni già aperte**: scrivi `/reload-plugins`, oppure chiudi e riapri la sessione.
- **Aprire il pannello** in qualsiasi momento: `/regia`.

Nel pannello:

- **Compatta / Espandi**: tiene solo radar, agenti e skill, oppure mostra tutto;
- **Azzera statistiche**: azzera chiamate, agenti, skill e file della sessione. Contesto e limiti restano.

Mentre lavorano dei subagenti, la status line mostra "Regia · N agenti in corso".

## Aggiornare e disinstallare

Con l'installazione da GitHub:

```bash
claude plugin marketplace update mod-claude
```

```bash
claude plugin update regia@mod-claude
```

Con la copia locale bastano `git pull` e `/reload-plugins` nelle sessioni aperte.

Per disinstallare:

```bash
claude plugin uninstall regia@mod-claude
```

## Sviluppo

La mappa del codice (cosa fa ogni file, come si collegano, le regole del rendering sul desktop) è in [overview.md](overview.md).

Per controllare il plugin come lo legge l'engine:

```bash
claude plugin validate regia
```

Per i test:

```bash
claude plugin test regia
```

Per l'anteprima nel browser con dati finti, compresa una sessione simulata in tempo reale:

```bash
node regia/preview/build.mjs
```

Poi servi la cartella `regia/preview/` con un server statico qualsiasi e apri `live.html?w=400`.
