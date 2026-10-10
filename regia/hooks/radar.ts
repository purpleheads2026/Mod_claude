// Radar della Regia: il monitor principale, in testa al pannello.
//
//   centro   il nucleo (sessione principale): stato, cronometro del turno, anello del
//            contesto. Respira mentre è in onda; ogni strumento che parte manda un'onda
//            del colore della sua categoria.
//   orbita   i subagenti come satelliti, su 8 posizioni fisse per ordine di nascita
//            (un satellite non cambia posto). Monogramma uguale a quello delle schede.
//            In corso: fascio tratteggiato che scorre dal nucleo; entrano
//            con un pop, finiscono con un'onda del colore d'esito.
//   corona   gli ultimi 60 secondi di strumenti, una traccia per operatore (principale
//            in fuori). La lancetta in alto è "ora": le tracce nascono lì, ruotano in
//            senso orario alla velocità reale del tempo (6°/s) e si spengono a 60 s.
//
// Come resta fluido tra un ridisegno e l'altro: le tracce sono disegnate su angoli
// assoluti (istante mod 60 s) dentro un gruppo che ruota agganciato all'orologio
// (motion.ts → phase). Angolo a schermo = età × 6°, sempre, a ogni frame.
// Senza motion il gruppo ha la rotazione dell'istante del ridisegno come attributo.

import type { RegiaSnapshot } from '../types'
import { DUR, phase, since } from './motion'
import {
  badge,
  C,
  CATEGORY,
  CATEGORY_ORDER,
  contextPercent,
  doc,
  esc,
  fit,
  fmtClock,
  fmtSpan,
  fiveHourLimit,
  head,
  isRunning,
  monograms,
  nTools,
  PAD,
  STATUS,
  swatch,
  textWidth,
} from './svg'

const WINDOW = DUR.sweep
const DEG_PER_MS = 360 / WINDOW
const SLOTS = 8
const SLOT_START = 22.5
/** Ordine di riempimento delle 8 posizioni: alterna i lati, così 2–4 satelliti stanno in equilibrio. */
const SLOT_ORDER = [0, 4, 2, 6, 1, 5, 3, 7]

/** Punto a `deg` gradi in senso orario dalle 12, a distanza `r` dal centro. */
const at = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}

const n2 = (v: number): string => v.toFixed(2)

/** Arco in senso orario da `from` a `from + span` gradi. */
const arc = (cx: number, cy: number, r: number, from: number, span: number): string => {
  const [x1, y1] = at(cx, cy, r, from)
  const [x2, y2] = at(cx, cy, r, from + Math.min(span, 359.9))
  return `M${n2(x1)} ${n2(y1)}A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${n2(x2)} ${n2(y2)}`
}

/** Angolo "assoluto" di un istante nel gruppo che ruota. */
const local = (t: number): number => -((t % WINDOW) / WINDOW) * 360

const gaugeColor = (pct: number): string => (pct >= 90 ? C.bad : pct >= 75 ? C.run : C.ink)

export const radarSvg = (s: RegiaSnapshot, now: number, w: number): string => {
  const isLive = s.turn.isWorking
  const D = Math.min(w - PAD * 2, 440)
  // 28 px di margine: le etichette 15s/45s stanno fuori dall'anello e non devono uscire dal viewBox.
  const rOut = D / 2 - 28
  const cx = w / 2
  const cy = 40 + 16 + rOut
  const monos = monograms(s.agents)

  // ── Corsie della corona: principale + fino a 3 operatori, in ordine di nascita.
  const recent = s.calls.filter(c => now - (c.endedAt ?? now) < WINDOW)
  const laneAgents = [...s.agents]
    .sort((a, b) => a.startedAt - b.startedAt)
    .filter(a => isRunning(a) || recent.some(c => c.agentId !== undefined && c.agentId === a.agentId))
    .slice(-3)
  const lanes: { id?: string; label: string }[] = [
    { label: 'CL' },
    ...laneAgents.map(a => ({ ...(a.agentId === undefined ? {} : { id: a.agentId }), label: monos.get(a.key) ?? '?' })),
  ]
  const pitch = Math.max(8, Math.min(11, rOut * 0.068))
  const thick = pitch - 3.5
  const laneR = (i: number): number => rOut - 7 - i * pitch
  const bandIn = laneR(lanes.length - 1) - thick / 2 - 4

  // ── Nucleo e orbita.
  const rCore = rOut * 0.28
  const rGauge = rCore + 8
  const rSat = (bandIn + rGauge + 6) / 2
  const nodeR = Math.max(10, Math.min(13, rOut * 0.075))

  const pct = contextPercent(s)
  const rot = ((now % WINDOW) / WINDOW) * 360

  let body = ''

  // Intestazione.
  const lim = fiveHourLimit(s)
  const right = [s.turn.count > 0 ? `TURNO ${s.turn.count}` : '', lim === undefined ? '' : `5 ORE ${Math.round(lim.percentUsed)}%`]
    .filter(Boolean)
    .join(' · ')
  body += head(w, 'REGIA', right, isLive ? C.run : C.ink3)

  body +=
    `<defs>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="${C.run}" stop-opacity=".30"/><stop offset=".55" stop-color="${C.run}" stop-opacity=".08"/><stop offset="1" stop-color="${C.run}" stop-opacity="0"/></radialGradient>` +
    `</defs>`

  // ── Corona: binari, tacche, scia della lancetta.
  lanes.forEach((_, i) => {
    body += `<circle cx="${cx}" cy="${cy}" r="${n2(laneR(i))}" fill="none" stroke="${C.raised}" stroke-width="${thick}"/>`
  })
  body += `<circle cx="${cx}" cy="${cy}" r="${rOut + 3}" fill="none" stroke="${C.frame}"/>`
  for (let deg = 0; deg < 360; deg += 30) {
    const major = deg % 90 === 0
    const [x1, y1] = at(cx, cy, rOut + 3, deg)
    const [x2, y2] = at(cx, cy, rOut + (major ? 9 : 6), deg)
    body += `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${major ? C.ink3 : C.frame}"/>`
  }
  const tick = (deg: number, text: string, anchor: string, dx: number, dy: number): string => {
    const [x, y] = at(cx, cy, rOut + 12, deg)
    return `<text class="dim" x="${n2(x + dx)}" y="${n2(y + dy)}" text-anchor="${anchor}" style="font-size:9px">${text}</text>`
  }
  body +=
    tick(90, '15s', 'start', 0, 3) +
    tick(180, '30s', 'middle', 0, 8) +
    tick(270, '45s', 'end', 0, 3) +
    `<text class="cap" x="${cx}" y="${n2(cy - rOut - 14)}" text-anchor="middle" style="fill:${isLive ? C.run : C.ink3}">ORA</text>`

  if (isLive) {
    // Scia: uno spicchio di 36° dietro la lancetta, dove nascono le tracce, che sfuma
    // allontanandosi da "ora".
    const [ox1, oy1] = at(cx, cy, rOut, 0)
    const [ox2, oy2] = at(cx, cy, rOut, 36)
    const [ix2, iy2] = at(cx, cy, bandIn, 36)
    const [ix1, iy1] = at(cx, cy, bandIn, 0)
    body +=
      `<linearGradient id="trail" gradientUnits="userSpaceOnUse" x1="${cx}" y1="0" x2="${n2(ox2)}" y2="0">` +
      `<stop offset="0" stop-color="${C.run}" stop-opacity=".16"/><stop offset="1" stop-color="${C.run}" stop-opacity="0"/></linearGradient>` +
      `<path d="M${n2(ox1)} ${n2(oy1)}A${rOut} ${rOut} 0 0 1 ${n2(ox2)} ${n2(oy2)}L${n2(ix2)} ${n2(iy2)}A${n2(bandIn)} ${n2(bandIn)} 0 0 0 ${n2(ix1)} ${n2(iy1)}Z" fill="url(#trail)"/>`
  }

  // ── Tracce: gruppo che ruota agganciato all'orologio.
  let marks = ''
  lanes.forEach((lane, i) => {
    const r = laneR(i)
    for (const c of recent.filter(v => v.agentId === lane.id)) {
      const t1 = c.endedAt ?? now
      const age1 = now - t1
      const age0 = now - c.startedAt
      const shown = Math.min(age0, WINDOW) - age1
      const span = Math.max(1.8, shown * DEG_PER_MS)
      const from = local(t1)
      const color = CATEGORY[c.category].color
      const isLiveCall = c.endedAt === undefined
      marks += isLiveCall
        ? `<path d="${arc(cx, cy, r, from, span)}" fill="none" stroke="${color}" stroke-width="${thick}"/>` +
          (() => {
            const [hx, hy] = at(cx, cy, r, from)
            return `<circle class="a-breathe" cx="${n2(hx)}" cy="${n2(hy)}" r="${thick / 2 + 1}" fill="${C.ink}" style="${phase(now, DUR.breathe * 2)}"/>`
          })()
        : `<path class="a-fade" d="${arc(cx, cy, r, from, span)}" fill="none" stroke="${color}" stroke-width="${thick}" opacity="${Math.max(0, 1 - age1 / WINDOW).toFixed(3)}" style="${since(age1)}"/>`
      if (c.isError) {
        const [ex, ey] = at(cx, cy, r + thick / 2 + 3, from + span / 2)
        marks += `<circle class="a-fade" cx="${n2(ex)}" cy="${n2(ey)}" r="2" fill="${C.bad}" style="${since(age1)}"/>`
      }
      if (age0 < DUR.ripple) {
        // Scintilla all'emissione.
        const [sx, sy] = at(cx, cy, r, local(c.startedAt))
        marks += `<circle class="a-ripple motion" cx="${n2(sx)}" cy="${n2(sy)}" r="${thick / 2 + 1.5}" fill="${C.ink}" style="${since(age0)}"/>`
      }
    }
  })
  // Quando l'SVG è un'immagine, Chrome ignora transform-origin e somma l'attributo
  // transform all'animazione: il gruppo esterno porta l'origine al centro, quello animato
  // ruota attorno a 0,0 senza attributo (la rotazione di riserva sta in --rot, letta
  // solo senza motion), quello interno riporta l'origine.
  body +=
    `<g transform="translate(${cx} ${n2(cy)})"><g class="a-spin" style="--rot:${n2(rot)}deg;${phase(now, WINDOW)}">` +
    `<g transform="translate(${-cx} ${n2(-cy)})">${marks}</g></g></g>`

  // Lancetta ed etichette delle corsie (fisse).
  body += `<line x1="${cx}" y1="${n2(cy - bandIn + 2)}" x2="${cx}" y2="${n2(cy - rOut - 6)}" stroke="${isLive ? C.run : C.ink3}" stroke-width="1.5" stroke-opacity="${isLive ? 1 : 0.6}"/>`
  lanes.forEach((lane, i) => {
    body += `<text class="dim" x="${n2(cx - thick - 3)}" y="${n2(cy - laneR(i) + 3)}" text-anchor="end" style="font-size:8.5px;letter-spacing:.06em">${esc(lane.label)}</text>`
  })

  // ── Orbita: satelliti su posizioni fisse per ordine di nascita.
  const born = [...s.agents].sort((a, b) => a.startedAt - b.startedAt)
  const sats = born.map((a, idx) => ({ a, slot: SLOT_ORDER[idx % SLOTS] ?? 0 })).slice(-SLOTS)
  body += `<circle cx="${cx}" cy="${n2(cy)}" r="${n2(rSat)}" fill="none" stroke="${C.grid}" stroke-dasharray="1 5"/>`

  let beams = ''
  let nodes = ''
  for (const { a, slot } of sats) {
    const deg = SLOT_START + slot * (360 / SLOTS)
    const [x, y] = at(cx, cy, rSat, deg)
    const [bx1, by1] = at(cx, cy, rGauge + 6, deg)
    const [bx2, by2] = at(cx, cy, rSat - nodeR - 6, deg)
    const running = isRunning(a)
    const st = STATUS[a.status]
    const mono = monos.get(a.key) ?? '?'
    const age = now - a.startedAt
    const ended = a.endedAt === undefined ? Infinity : now - a.endedAt

    if (running) {
      const path = `M${n2(bx1)} ${n2(by1)}L${n2(bx2)} ${n2(by2)}`
      beams +=
        `<path class="a-flow" d="${path}" stroke="${C.run}" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="3 4" style="${phase(now, DUR.flow)}"/>`
    } else {
      beams += `<path d="M${n2(bx1)} ${n2(by1)}L${n2(bx2)} ${n2(by2)}" stroke="${st.color}" stroke-opacity=".22" stroke-width="1"/>`
    }

    // Onde: ogni strumento del satellite, la nascita, l'esito.
    let waves = ''
    for (const c of s.calls) {
      if (c.agentId !== undefined && c.agentId === a.agentId && now - c.startedAt < DUR.ripple) {
        waves += `<circle class="a-ripple motion" cx="${n2(x)}" cy="${n2(y)}" r="${nodeR}" fill="none" stroke="${CATEGORY[c.category].color}" stroke-width="2" style="${since(now - c.startedAt)}"/>`
      }
    }
    if (age < DUR.burst) {
      waves += `<circle class="a-burst motion" cx="${n2(x)}" cy="${n2(y)}" r="${nodeR}" fill="none" stroke="${C.run}" stroke-width="1.5" style="${since(age)}"/>`
    }
    if (ended < DUR.burst) {
      waves += `<circle class="a-burst motion" cx="${n2(x)}" cy="${n2(y)}" r="${nodeR}" fill="none" stroke="${st.color}" stroke-width="2" style="${since(ended)}"/>`
    }

    const time = fmtClock((a.endedAt ?? now) - a.startedAt)
    nodes +=
      waves +
      `<g${age < DUR.pop * 2 ? ` class="a-pop" style="${since(age)}"` : ''}>` +
      `<title>${esc(`${mono} · ${a.type} — ${a.description}\n${st.label.toLowerCase()} · ${time}`)}</title>` +
      badge(x, y, nodeR, mono, a.status, now) +
      `<text class="dim" x="${n2(x)}" y="${n2(y + nodeR + 13)}" text-anchor="middle" style="font-size:9px${running ? `;fill:${C.run}` : ''}">${time}</text>` +
      `</g>`
  }
  body += beams

  // ── Nucleo.
  if (isLive) {
    body += `<circle class="a-breathe" cx="${cx}" cy="${n2(cy)}" r="${n2(rCore * 2.1)}" fill="url(#glow)" style="${phase(now, DUR.breathe * 2)}"/>`
  }
  for (const c of s.calls) {
    if (c.agentId === undefined && now - c.startedAt < DUR.ripple) {
      body += `<circle class="a-ripple motion" cx="${cx}" cy="${n2(cy)}" r="${n2(rGauge)}" fill="none" stroke="${CATEGORY[c.category].color}" stroke-width="2" style="${since(now - c.startedAt)}"/>`
    }
  }
  body +=
    `<circle cx="${cx}" cy="${n2(cy)}" r="${n2(rCore)}" fill="${C.raised}" stroke="${isLive ? C.run : C.frame}" stroke-opacity="${isLive ? 0.5 : 1}"/>` +
    `<circle cx="${cx}" cy="${n2(cy)}" r="${n2(rGauge)}" fill="none" stroke="${C.track}" stroke-width="4"/>`
  for (const q of [25, 50, 75]) {
    const [qx1, qy1] = at(cx, cy, rGauge - 3.5, q * 3.6)
    const [qx2, qy2] = at(cx, cy, rGauge + 3.5, q * 3.6)
    body += `<line x1="${n2(qx1)}" y1="${n2(qy1)}" x2="${n2(qx2)}" y2="${n2(qy2)}" stroke="${C.screen}" stroke-width="1.5"/>`
  }
  if (pct !== undefined && pct > 0) {
    const p = Math.min(100, pct)
    const prev = s.meters.prev?.contextPercent
    const m = s.meters.measuredAt
    const grow = m !== undefined && now - m < DUR.grow + 200 && prev !== undefined && prev < p
    body +=
      `<circle${grow ? ` class="a-dash" style="${since(now - (m ?? now))};--from:${n2(p - (prev ?? 0))}"` : ''} cx="${cx}" cy="${n2(cy)}" r="${n2(rGauge)}" fill="none" stroke="${gaugeColor(p)}" stroke-width="4" pathLength="100" stroke-dasharray="${n2(p)} 100" transform="rotate(-90 ${cx} ${n2(cy)})"/>`
  }

  const word = isLive ? 'IN ONDA' : 'IN ATTESA'
  const clock = isLive && s.turn.startedAt !== undefined
    ? fmtClock(now - s.turn.startedAt)
    : s.turn.lastMs !== undefined ? fmtClock(s.turn.lastMs) : '—'
  // Sotto ~46 px di raggio 'contesto 43%' tocca l'anello: resta solo il numero.
  const ctxFs = Math.max(8, rCore * 0.19)
  const ctxFull = pct === undefined ? 'contesto —' : `contesto ${Math.round(pct)}%`
  const ctxShort = pct === undefined ? 'ctx —' : `ctx ${Math.round(pct)}%`
  const ctxLabel = textWidth(ctxFull, ctxFs) <= rCore * 1.55 ? ctxFull : ctxShort
  body +=
    `<text x="${cx}" y="${n2(cy - rCore * 0.36)}" text-anchor="middle" style="font-size:${Math.max(8, rCore * 0.2).toFixed(1)}px;letter-spacing:.2em;font-weight:700;fill:${isLive ? C.run : C.ink3}">${word}</text>` +
    `<text class="num${clock === '—' ? ' dim' : ''}" x="${cx}" y="${n2(cy + rCore * 0.2)}" text-anchor="middle" style="font-size:${(rCore * 0.6).toFixed(1)}px">${clock}</text>` +
    `<text class="dim" x="${cx}" y="${n2(cy + rCore * 0.55)}" text-anchor="middle" style="font-size:${Math.max(8, rCore * 0.19).toFixed(1)}px">${ctxLabel}</text>`

  body += nodes

  // ── Sotto il quadrante: cosa gira adesso, meta, legenda.
  let y = cy + rOut + 34
  const live = [...s.calls].reverse().find(c => c.endedAt === undefined && c.agentId === undefined)
  if (live !== undefined) {
    const isMcp = live.tool.startsWith('mcp__')
    const name = isMcp ? live.label : live.tool
    const nameW = Math.min(textWidth(name, 11), 130)
    body +=
      swatch(PAD, y - 8, CATEGORY[live.category].color) +
      `<text class="ink" x="${PAD + 14}" y="${y}">${esc(fit(name, 130))}</text>` +
      `<text x="${PAD + 24 + nameW}" y="${y}">${esc(fit(isMcp ? '' : live.label, w - PAD * 2 - nameW - 26))}</text>`
  } else if (s.turn.prompt !== undefined) {
    // Il testo della persona tra virgolette; una notifica interna (↳) così com'è.
    const p = s.turn.prompt
    body += `<text class="dim" x="${PAD}" y="${y}">${esc(p.startsWith('↳') ? fit(p, w - PAD * 2) : `«${fit(p, w - PAD * 2 - 14)}»`)}</text>`
  } else {
    body += `<text x="${PAD}" y="${y}">${esc(fit('Scrivi un prompt: la regia si accende.', w - PAD * 2))}</text>`
  }

  y += 18
  const total = Object.values(s.toolCounts).reduce((a, b) => a + b, 0)
  const errs = s.errorCount > 0 ? `${s.errorCount} ${s.errorCount === 1 ? 'errore' : 'errori'}` : undefined
  const sessionSpan = fmtSpan(now - s.startedAt)
  const metaSets = [
    [s.meters.model, nTools(total), errs, `sessione ${sessionSpan}`],
    [s.meters.model, nTools(total), errs, `sess. ${sessionSpan}`],
    [nTools(total), errs, `sess. ${sessionSpan}`],
  ].map(set => set.filter((x): x is string => x !== undefined && x !== ''))
  const metaMax = Math.floor((w - PAD * 2) / 6)
  const meta = metaSets.find(set => set.join(' · ').length <= metaMax) ?? metaSets[2] ?? []
  body += `<text class="dim small" x="${PAD}" y="${y}">${esc(fit(meta.join(' · '), w - PAD * 2, 10))}</text>`

  const present = CATEGORY_ORDER.filter(cat => recent.some(c => c.category === cat))
  if (present.length > 0) {
    y += 22
    let x = PAD
    for (const cat of present) {
      const label = CATEGORY[cat].label
      const lw = 14 + textWidth(label, 10) + 14
      if (x + lw > w - PAD) {
        x = PAD
        y += 16
      }
      body += swatch(x, y - 8, CATEGORY[cat].color) + `<text class="small" x="${x + 13}" y="${y}">${label}</text>`
      x += lw
    }
  }
  const h = y + 16

  const running = s.agents.filter(isRunning).length
  const label = `Regia: ${word.toLowerCase()}, turno ${s.turn.count}, ${clock}; ${running} agenti in corso; ${recent.length} chiamate nell'ultimo minuto`
  return doc(w, h, body, label)
}

