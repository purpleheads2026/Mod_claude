# Stato — Mod Regia

Aggiornato: 2026-10-19 · Sessione: Mod_claude · Regia

## Fatto
- Plugin Regia 0.3.2: radar, strumentazione con limite delle 5 ore, agenti, skill, attività,
  strumenti, file; bilingue (en default, it); render deterministico (niente scroll in loop).
- Skill rilevate da tre segnali più il recupero dalla cronologia (0.3.2, 2026-10-11).
- Vetrina: README animato, GitHub Pages con demo live, anteprime social, licenza MIT.
- Installato nel profilo purpleheads (dalla cartella) e, dal 2026-10-12, nel profilo Aldeia
  (dal marketplace GitHub), entrambi in italiano.
- 2026-10-13: purpleheads girava ancora la 0.2.0 (costo al posto del limite delle 5 ore) perché
  carica la copia in cache, non `regia/`. Aggiornata a 0.3.2 negli scope user e project (home).
- 2026-10-19: Regia su VS Code. L'estensione (2.1.292) è una superficie `vscode` con gli
  elementi del desktop tranne `Client`: Regia disegna gli stessi monitor SVG. Nuovo test che
  monta il pannello su `vscode` (laterale 90 colonne e in basso 200×18) e lo confronta col
  desktop: verde sull'engine del desktop (2.1.295, 7/7) e su quello dell'estensione.
  L'estensione parte col profilo purpleheads (`claudeCode.environmentVariables` →
  `CLAUDE_CONFIG_DIR` nelle impostazioni utente di VS Code).

## In corso
- 2026-10-19: Regia visibile dal vivo in VS Code (estensione 2.1.301, profilo purpleheads,
  dopo Reload Window). Lo screenshot mostrava la strumentazione rotta a ~300 px.
- 2026-10-19: Regia 0.3.3. Strumentazione per pannelli stretti: i tre riquadri diventano righe
  quando etichette o dettagli non entrano interi (soglia ~416 px en, ~432 px it); legenda della
  composizione su una colonna se i nomi non entrano; reset dei limiti mai sotto la percentuale.
  `/regia` dice quando il pannello non è sullo schermo e perché. Test 10/10 su 2.1.295 e 2.1.301
  (design-reviewer: nessun troncamento da 250 px in su). Aggiornata nel profilo purpleheads
  (scope user e project). Pushata su GitHub e aggiornata nel profilo Aldeia (scope user).

## Prossimi passi
0. `/reload-plugins` (o sessione nuova) in VS Code, nel desktop purpleheads e nell'app Aldeia:
   deve comparire la 0.3.3 con la strumentazione a righe nel pannello stretto.
0b. A 300 px: in "FILE TOCCATI" titolo e contatore quasi si toccano; in "AGENTI" il nome si
   tronca accanto allo stato (forse voluto). Da decidere.
1. In ogni sessione aperta, purpleheads e Aldeia: `/reload-plugins` (o sessione nuova) e
   controllare che compaia il riquadro LIMITE 5 ORE.
2. In Bolo, `/reload-plugins` e verificare che `instagram-marketing` compaia tra le skill.
3. Caricare a mano `docs/media/social-github.png` in GitHub → Settings → General → Social preview.

0c. Vetrina (`docs/index.html`): il pre-delivery-gate del 2026-10-19 segnala meta description di
   167 caratteri (max 160), 3 sezioni senza `.section__inner`, 2 `<h2>` senza ruolo, colori della
   legenda in linea. Vecchie, non della 0.3.3: da sistemare in un commit a parte.

## Decisioni
- 2026-10-10: render deterministico, l'ora del disegno non è mai `$.clock.now()`.
- 2026-10-11: le skill non si affidano a `skill.prompt` da solo.
- 2026-10-12: fronte unico (plugin e vetrina escono sempre insieme).
- 2026-10-12: su Aldeia il plugin arriva da GitHub, non dalla cartella, per tenere i profili
  separati.
- 2026-10-13: ogni release richiede `claude plugin update regia@mod-claude` in ogni profilo.

- 2026-10-19: VS Code richiede l'estensione 2.1.301 o successiva. La 2.1.292 carica il plugin
  (`/regia` risponde) ma la sua interfaccia non disegna i pannelli dei plugin (nessun `ui_render`
  nel bundle): pannello aperto e invisibile. Sulla 2.1.301 i test passano 7/7.

## Aperto con altri fronti
- niente
