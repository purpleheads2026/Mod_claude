# Stato — Mod Regia

Aggiornato: 2026-10-13 · Sessione: Mod_claude · Regia

## Fatto
- Plugin Regia 0.3.2: radar, strumentazione con limite delle 5 ore, agenti, skill, attività,
  strumenti, file; bilingue (en default, it); render deterministico (niente scroll in loop).
- Skill rilevate da tre segnali più il recupero dalla cronologia (0.3.2, 2026-10-11).
- Vetrina: README animato, GitHub Pages con demo live, anteprime social, licenza MIT.
- Installato nel profilo purpleheads (dalla cartella) e, dal 2026-10-12, nel profilo Aldeia
  (dal marketplace GitHub), entrambi in italiano.
- 2026-10-13: purpleheads girava ancora la 0.2.0 (costo al posto del limite delle 5 ore) perché
  carica la copia in cache, non `regia/`. Aggiornata a 0.3.2 negli scope user e project (home).

## In corso
- niente

## Prossimi passi
1. In ogni sessione aperta, purpleheads e Aldeia: `/reload-plugins` (o sessione nuova) e
   controllare che compaia il riquadro LIMITE 5 ORE.
2. In Bolo, `/reload-plugins` e verificare che `instagram-marketing` compaia tra le skill.
3. Caricare a mano `docs/media/social-github.png` in GitHub → Settings → General → Social preview.

## Decisioni
- 2026-10-10: render deterministico, l'ora del disegno non è mai `$.clock.now()`.
- 2026-10-11: le skill non si affidano a `skill.prompt` da solo.
- 2026-10-12: fronte unico (plugin e vetrina escono sempre insieme).
- 2026-10-12: su Aldeia il plugin arriva da GitHub, non dalla cartella, per tenere i profili
  separati.
- 2026-10-13: ogni release richiede `claude plugin update regia@mod-claude` in ogni profilo.

## Aperto con altri fronti
- niente
