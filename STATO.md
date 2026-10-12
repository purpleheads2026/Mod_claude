# Stato — Mod Regia

Aggiornato: 2026-10-12 · Sessione: Mod_claude · Regia

## Fatto
- Plugin Regia 0.3.2: radar, strumentazione con limite delle 5 ore, agenti, skill, attività,
  strumenti, file; bilingue (en default, it); render deterministico (niente scroll in loop).
- Skill rilevate da tre segnali più il recupero dalla cronologia (0.3.2, 2026-10-11).
- Vetrina: README animato, GitHub Pages con demo live, anteprime social, licenza MIT.
- Installato nel profilo purpleheads (dalla cartella) e, dal 2026-10-12, nel profilo Aldeia
  (dal marketplace GitHub), entrambi in italiano.

## In corso
- niente

## Prossimi passi
1. Aprire una sessione nuova su Aldeia (o `/reload-plugins` in quelle aperte) e controllare che
   il pannello compaia.
2. In Bolo, `/reload-plugins` e verificare che `instagram-marketing` compaia tra le skill.
3. Caricare a mano `docs/media/social-github.png` in GitHub → Settings → General → Social preview.

## Decisioni
- 2026-10-10: render deterministico, l'ora del disegno non è mai `$.clock.now()`.
- 2026-10-11: le skill non si affidano a `skill.prompt` da solo.
- 2026-10-12: fronte unico (plugin e vetrina escono sempre insieme).
- 2026-10-12: su Aldeia il plugin arriva da GitHub, non dalla cartella, per tenere i profili
  separati.

## Aperto con altri fronti
- niente
