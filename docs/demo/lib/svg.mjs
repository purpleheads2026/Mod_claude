// Generatori SVG della Regia: ogni funzione prende lo snapshot, l'ora e una larghezza
// in px e restituisce un documento <svg> autonomo (un "monitor" della parete).
// Puri: nessun `$`, nessun orologio (il `now` arriva da fuori). preview/build.mjs li
// esegue con dati finti per la revisione visiva nel browser.
// Il monitor principale (il radar) sta in radar.ts e usa i token e le utilità di qui;
// il motion (keyframes, fase agganciata all'orologio) sta in motion.ts.
//
// Direzione: sala regia broadcast. Schermi grafite, inchiostro caldo, ambra = in onda,
// verde = fatto, rosso = errore. Categorie strumenti: palette categoriale scura
// validata (dataviz, adjacent CVD ΔE ≥ 8.4 su #15171B), ordine fisso, mai ciclata.
// Il testo veste sempre i token d'inchiostro, mai il colore della serie.
// Nessuna scritta qui: ogni testo arriva dal dizionario `Strings` (i18n.ts).
//
// Tutti i monitor sono mostrati come immagini: il desktop mette gli Svg interattivi in
// un iframe alto 150 px e li rimpicciolisce (verificato su uno screenshot reale), quindi
// niente isInteractive e niente tooltip che contino come unica fonte di un dato.
// Un'immagine con sorgente identica non viene ricaricata: i cicli proseguono; quando
// cambia, la fase agganciata all'orologio (motion.ts) li riprende dal punto giusto.

             
             
            
                
                 
                
              
                 
                                                
import { DUR, motionCss, phase, since } from './motion.mjs'

// ── Token ────────────────────────────────────────────────────────────────────

export const C = {
  screen: '#15171B',
  raised: '#1C1F25',
  frame: '#2A2E36',
  grid: '#22252C',
  track: '#262A31',
  ink: '#F1EEE6',
  ink2: '#B4B0A6',
  ink3: '#8D8B84',
  run: '#fab219',
  good: '#0ca30c',
  bad: '#d03b3b',
  wait: '#8C93A1',
  system: '#8F8A7F',
}         

export const CATEGORY                                           = {
  read: { color: '#3987e5' },
  write: { color: '#d95926' },
  shell: { color: '#199e70' },
  web: { color: '#c98500' },
  agent: { color: '#d55181' },
  skill: { color: '#008300' },
  mcp: { color: '#9085e9' },
  other: { color: '#5E636D' },
}

export const CATEGORY_ORDER                  = [
  'read', 'write', 'shell', 'web', 'agent', 'skill', 'mcp', 'other',
]

export const STATUS                                         = {
  pending: { color: C.wait },
  running: { color: C.run },
  waiting: { color: C.wait },
  idle: { color: C.wait },
  completed: { color: C.good },
  failed: { color: C.bad },
  killed: { color: C.bad },
}

const MONO = `ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace`
const NUM = `'DIN Alternate','DIN Condensed','Bahnschrift',ui-monospace,monospace`
export const PAD = 16
export const HEAD_Y = 24
export const BODY_Y = 42
/** Avanzamento di un carattere monospace, in em. */
const ADVANCE = 0.6

// ── Utilità ──────────────────────────────────────────────────────────────────

export const esc = (text        )         =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Tronca un testo monospace per stare in `px` a corpo `size`. */
export const fit = (text        , px        , size = 11)         => {
  const max = Math.max(1, Math.floor(px / (size * ADVANCE)))
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}

export const textWidth = (text        , size        , spacing = 0)         =>
  text.length * size * (ADVANCE + spacing)

/** Elenca le parti separate da « · » togliendo da destra quelle che non entrano in `px`. */
export const fitParts = (parts                   , px        , size        )         => {
  const max = Math.floor(px / (size * ADVANCE))
  let n = parts.length
  while (n > 1 && parts.slice(0, n).join(' · ').length > max) n -= 1
  return fit(parts.slice(0, n).join(' · '), px, size)
}

const dec = (n        , L         , digits = 1)         => n.toFixed(digits).replace('.', L.decimal)

export const fmtTokens = (n        , L         )         => {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${dec(n / 1000, L, n < 10_000 ? 1 : 0)}k`
  return `${dec(n / 1_000_000, L)}M`
}

export const fmtClock = (ms        )         => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const fmtSpan = (ms        , L         )         => {
  const u = L.units
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ${u.ms}`
  if (ms < 10_000) return `${dec(ms / 1000, L)} ${u.s}`
  if (ms < 60_000) return `${Math.round(ms / 1000)} ${u.s}`
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m} ${u.min}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ${u.h} ${m % 60} ${u.min}`
  return `${Math.floor(h / 24)} ${u.d} ${h % 24} ${u.h}`
}


const style = `
:root{color-scheme:light dark}
text{font-family:${MONO};fill:${C.ink2};font-size:11px}
.cap{font-size:9.5px;letter-spacing:.16em;fill:${C.ink3}}
.head{font-size:10px;letter-spacing:.18em;fill:${C.ink2};font-weight:600}
.num{font-family:${NUM};fill:${C.ink}}
.ink{fill:${C.ink}}
.dim{fill:${C.ink3}}
.small{font-size:10px}
.hit{fill:transparent}
.hov:hover .lift{stroke:${C.ink3}}
${motionCss}`

/** Un monitor: cornice, stile comune, motion; `extra` aggiunge regole proprie del monitor. */
export const doc = (w        , h        , body        , label        , extra = '')         =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">` +
  `<style>${style}${extra}</style>` +
  `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="12" fill="${C.screen}" stroke="${C.frame}"/>` +
  body +
  `</svg>`

export const head = (w        , title        , right = '', rightColor         = C.ink3)         =>
  `<text class="head" x="${PAD}" y="${HEAD_Y}">${esc(title)}</text>` +
  (right === ''
    ? ''
    : `<text class="cap" x="${w - PAD}" y="${HEAD_Y}" text-anchor="end" style="fill:${rightColor}">${esc(right)}</text>`)

/** Spia di stato; con `isLive` l'alone pulsa in fase con l'orologio (nascosto con reduced motion). */
export const lamp = (x        , y        , color        , isLive         , now        , r = 4)         =>
  (isLive
    ? `<circle class="motion a-ping" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5" style="${phase(now, DUR.ping)}"/>`
    : '') + `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`

export const emptyLine = (w        , y        , text        )         =>
  `<text x="${PAD}" y="${y}">${esc(fit(text, w - PAD * 2))}</text>`

export const swatch = (x        , y        , color        , size = 8)         =>
  `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${color}"/>`

const elapsed = (from        , to                    , now        )         =>
  (to ?? now) - from

export const isRunning = (a            )          => a.status === 'running' || a.status === 'pending'

const isEnded = (a            )          => ['completed', 'failed', 'killed'].includes(a.status)

/** Monogramma di un tipo di agente: iniziali delle prime due parole, o le prime due lettere. */
const initials = (type        )         => {
  const words = type.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const first = words[0] ?? '?'
  const second = words[1]
  return (second === undefined ? first.slice(0, 2) : `${first[0]}${second[0]}`).toUpperCase()
}

/**
 * Monogrammi unici per tutti gli agenti della sessione, in ordine di nascita
 * (GP, GP2, …): radar e schede usano gli stessi, così un satellite si ritrova nella lista.
 */
export const monograms = (agents                       )                      => {
  const seen = new Map                ()
  const out = new Map                ()
  for (const a of [...agents].sort((x, y) => x.startedAt - y.startedAt)) {
    const base = initials(a.type)
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    out.set(a.key, n === 1 ? base : `${base}${n}`)
  }
  return out
}

/** Distintivo circolare col monogramma: stesso disegno nel radar e nelle schede. */
export const badge = (
  x        ,
  y        ,
  r        ,
  mono        ,
  status             ,
  now        ,
)         => {
  const running = status === 'running' || status === 'pending'
  const color = STATUS[status].color
  return (
    (running
      ? `<circle class="a-orbit" cx="${x}" cy="${y}" r="${r + 4.5}" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="2 4" style="${phase(now, DUR.orbit)}"/>`
      : '') +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.raised}" stroke="${color}" stroke-width="1.5"${status === 'completed' ? ' stroke-opacity=".75"' : ''}/>` +
    `<text x="${x}" y="${y + r * 0.34}" text-anchor="middle" class="ink" style="font-size:${Math.max(8, r * 0.78)}px;font-weight:700;letter-spacing:.04em">${esc(mono)}</text>`
  )
}

// ── Strumentazione: contesto, costo, token, rate limit ───────────────────────

const limitKind = (kind        )                        => {
  const k = kind.toLowerCase()
  if (k.includes('five') || k.includes('5h') || k.includes('session')) return 'five'
  if (k.includes('opus')) return 'sevenOpus'
  if (k.includes('sonnet')) return 'sevenSonnet'
  if (k.includes('seven') || k.includes('week') || k.includes('7d')) return 'seven'
  return undefined
}

const limitLabel = (kind        , L         )         => {
  const known = limitKind(kind)
  return known === undefined ? kind.replace(/[_-]+/g, ' ') : L.limit[known]
}

/** Durata compatta per spazi stretti (i tile): "2h 12m", "3d 4h", "45m". */
const fmtSpanCompact = (ms        , L         )         => {
  const u = L.units
  const m = Math.max(1, Math.round(ms / 60_000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}${u.h} ${m % 60}m`
  return `${Math.floor(h / 24)}${u.d} ${h % 24}${u.h}`
}

/** Quanto manca all'azzeramento di una finestra, come durata già formattata ('' se ignoto). */
const resetSpan = (
  iso                    ,
  now        ,
  L         ,
  format                                     = fmtSpan,
)         => {
  if (iso === undefined) return ''
  const at = Date.parse(iso)
  if (Number.isNaN(at) || at <= now) return ''
  return format(at - now, L)
}

export const limitColor = (pct        )         => (pct >= 90 ? C.bad : pct >= 75 ? C.run : C.ink2)

/** La finestra di utilizzo delle 5 ore (abbonamento), se la sessione la riporta. */
export const fiveHourLimit = (s               )                             =>
  s.meters.rateLimits.find(r => limitKind(r.kind) === 'five')

export const contextPercent = (s               )                     => {
  const m = s.meters
  return m.contextPercent ?? (m.contextTokens !== undefined && m.contextWindow
    ? (m.contextTokens / m.contextWindow) * 100
    : undefined)
}

export const metersSvg = (s               , now        , w        , L         )         => {
  const m = s.meters
  const inner = w - PAD * 2
  const gap = 8
  const tileW = (inner - gap * 2) / 3
  const tileH = 64
  const pct = contextPercent(s)
  // Una misura nuova fa crescere le barre dal valore precedente al nuovo.
  const fresh = m.measuredAt !== undefined && now - m.measuredAt < DUR.grow + 200
  const grow = (from        )         =>
    fresh && m.measuredAt !== undefined
      ? ` class="a-grow" style="${since(now - m.measuredAt)};--from:${Math.max(0, from).toFixed(3)}"`
      : ''

  const tiles                                                                = [
    {
      cap: L.meters.context,
      value: pct === undefined ? '—' : `${Math.round(pct)}%`,
      sub: m.contextTokens !== undefined && m.contextWindow !== undefined
        ? `${fmtTokens(m.contextTokens, L)} / ${fmtTokens(m.contextWindow, L)}`
        : L.meters.notMeasured,
      ...(pct !== undefined && pct >= 75 ? { color: limitColor(pct) } : {}),
    },
    // Il limite delle 5 ore al posto del costo stimato a prezzi API, che con un
    // abbonamento non viene addebitato.
    (() => {
      const lim = fiveHourLimit(s)
      if (lim === undefined) return { cap: L.meters.fiveHour, value: '—', sub: L.meters.noLimit }
      const p = Math.round(lim.percentUsed)
      const span = resetSpan(lim.resetsAt, now, L, fmtSpanCompact)
      return {
        cap: L.meters.fiveHour,
        value: `${p}%`,
        sub: span === '' ? L.meters.windowOpen : L.resetsInShort(span),
        ...(p >= 75 ? { color: limitColor(p) } : {}),
      }
    })(),
    {
      cap: L.meters.outTokens,
      value: fmtTokens(m.outTokens, L),
      sub: L.meters.cache(fmtTokens(m.cacheReadTokens, L)),
    },
  ]

  let y = BODY_Y - 4
  let body = head(w, L.meters.title)

  tiles.forEach((tile, i) => {
    const x = PAD + i * (tileW + gap)
    body +=
      `<rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="8" fill="${C.raised}"/>` +
      `<text class="cap" x="${x + 10}" y="${y + 17}">${tile.cap}</text>` +
      (tile.color === undefined ? '' : `<circle cx="${x + tileW - 12}" cy="${y + 14}" r="3" fill="${tile.color}"/>`) +
      `<text class="num${tile.value === '—' ? ' dim' : ''}" x="${x + 10}" y="${y + 43}" style="font-size:24px">${esc(tile.value)}</text>` +
      `<text class="dim small" x="${x + 10}" y="${y + 57}">${esc(fit(tile.sub, tileW - 20, 10))}</text>`
  })
  y += tileH + 18

  {
    // Composizione del contesto: conversazione in inchiostro, overhead di sistema in
    // grigio caldo, spazio libero come binario, riserva di compattazione tratteggiata.
    const slices = m.slices
    if (slices.length > 0) {
      const total = slices.reduce((sum, sl) => sum + sl.tokens, 0)
      const usable = inner - 2 * (slices.length - 1)
      const prevPct = m.prev?.contextPercent
      const growFrom = prevPct !== undefined && pct !== undefined && pct > 0 ? prevPct / pct : 0
      body +=
        `<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
        `<rect width="5" height="5" fill="${C.track}"/><line x1="0" y1="0" x2="0" y2="5" stroke="${C.ink3}" stroke-width="1.4"/></pattern></defs>` +
        `<text class="cap" x="${PAD}" y="${y}">${L.meters.breakdown}</text>`
      y += 8
      let x = PAD
      let used = ''
      let rest = ''
      for (const sl of slices) {
        const sw = Math.max(2, (sl.tokens / total) * usable)
        const isTalk = /messag|conversa/i.test(sl.name)
        const fill = sl.kind === 'free' ? C.track : sl.kind === 'buffer' ? 'url(#hatch)' : isTalk ? C.ink : C.system
        const seg =
          `<g class="hov"><rect class="lift" x="${x}" y="${y}" width="${sw}" height="12" rx="2" fill="${fill}" stroke="transparent"/>` +
          `<title>${esc(`${sl.name} — ${L.meters.tokens(fmtTokens(sl.tokens, L))}`)}</title></g>`
        if (sl.kind === 'used') used += seg
        else rest += seg
        x += sw + 2
      }
      body += rest + `<g${grow(growFrom)}>${used}</g>`
      y += 28
      const named = slices.filter(sl => sl.kind === 'used').slice(0, 4)
      const colW = inner / 2
      named.forEach((sl, i) => {
        const cx = PAD + (i % 2) * colW
        const cy = y + Math.floor(i / 2) * 16
        const isTalk = /messag|conversa/i.test(sl.name)
        body +=
          swatch(cx, cy - 8, isTalk ? C.ink : C.system) +
          `<text x="${cx + 14}" y="${cy}">${esc(fit(sl.name, colW - 70))}</text>` +
          `<text class="ink" x="${cx + colW - 12}" y="${cy}" text-anchor="end">${fmtTokens(sl.tokens, L)}</text>`
      })
      y += Math.ceil(named.length / 2) * 16 + 10
    }

    // Rate limit: binari sottili; il colore di stato scatta solo oltre soglia.
    if (m.rateLimits.length > 0) {
      body += `<text class="cap" x="${PAD}" y="${y}">${L.meters.limits}</text>`
      y += 16
      for (const r of m.rateLimits) {
        const p = Math.max(0, Math.min(100, r.percentUsed))
        const span = resetSpan(r.resetsAt, now, L)
        const reset = span === '' ? '' : L.resetsIn(span)
        const prev = m.prev?.limits[r.kind]
        body +=
          `<text x="${PAD}" y="${y}">${esc(limitLabel(r.kind, L))}</text>` +
          `<text class="dim small" x="${PAD + 120}" y="${y}">${esc(reset)}</text>` +
          `<text class="num" x="${w - PAD}" y="${y}" text-anchor="end" style="font-size:14px">${Math.round(p)}%</text>` +
          `<rect x="${PAD}" y="${y + 6}" width="${inner}" height="4" rx="2" fill="${C.track}"/>` +
          `<rect${grow(prev !== undefined && p > 0 ? prev / p : 0)} x="${PAD}" y="${y + 6}" width="${Math.max(3, (p / 100) * inner)}" height="4" rx="2" fill="${limitColor(p)}"/>`
        y += 28
      }
    }
  }

  const h = y + 2
  const lim = fiveHourLimit(s)
  const label = L.meters.alt(
    pct === undefined ? L.meters.unknown : `${Math.round(pct)}%`,
    lim === undefined ? L.meters.unknown : `${Math.round(lim.percentUsed)}%`,
  )
  return doc(w, h, body, label)
}

// ── Agenti: la regia e i suoi operatori ──────────────────────────────────────

const agentOrder = (agents                       )               => {
  const live = agents.filter(a => !isEnded(a))
  const done = agents
    .filter(isEnded)
    .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
  return [...live.sort((a, b) => a.startedAt - b.startedAt), ...done]
}

export const agentsSvg = (
  s               ,
  now        ,
  w        ,
  isCompact         ,
  L         ,
)         => {
  const ordered = agentOrder(s.agents)
  const monos = monograms(s.agents)
  const liveCount = ordered.filter(isRunning).length
  const limit = isCompact ? Math.max(liveCount, 2) : 8
  const shown = ordered.slice(0, limit)
  const hidden = ordered.length - shown.length
  const ROW = 74
  const CARD_H = 64
  const BUS_X = PAD + 12
  const rootY = BODY_Y + 8
  const isLive = s.turn.isWorking

  let body = head(
    w,
    L.agents.title,
    ordered.length === 0 ? '' : L.agents.counts(liveCount, ordered.length),
    liveCount > 0 ? C.run : C.ink3,
  )

  // Nodo radice: la sessione principale.
  body +=
    `<rect x="${PAD}" y="${rootY - 12}" width="96" height="24" rx="12" fill="${C.raised}" stroke="${isLive ? C.run : C.frame}" stroke-opacity="${isLive ? 0.6 : 1}"/>` +
    lamp(PAD + 13, rootY, isLive ? C.run : C.ink3, isLive, now, 3.5) +
    `<text class="ink" x="${PAD + 24}" y="${rootY + 4}" style="font-weight:600;letter-spacing:.08em">CLAUDE</text>` +
    `<text class="dim small" x="${PAD + 108}" y="${rootY + 4}">${esc(L.agents.main)}</text>`

  if (shown.length === 0) {
    body += emptyLine(w, rootY + 40, L.agents.empty)
    return doc(w, rootY + 58, body, L.agents.altEmpty)
  }

  const firstY = rootY + 26
  const lastMid = firstY + (shown.length - 1) * ROW + 19
  body +=
    `<defs><linearGradient id="scan" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset=".38" stop-color="${C.run}" stop-opacity="0"/><stop offset=".5" stop-color="${C.run}" stop-opacity=".95"/>` +
    `<stop offset=".62" stop-color="${C.run}" stop-opacity="0"/></linearGradient></defs>` +
    `<line x1="${BUS_X}" y1="${rootY + 12}" x2="${BUS_X}" y2="${lastMid}" stroke="${C.frame}" stroke-width="1.5"/>`

  const callsOf = (a            )              =>
    a.agentId === undefined ? [] : s.calls.filter(c => c.agentId === a.agentId)

  shown.forEach((a, i) => {
    const nested = a.parentAgentId !== undefined && s.agents.some(p => p.agentId === a.parentAgentId)
    const y0 = firstY + i * ROW
    const x0 = BUS_X + 16 + (nested ? 14 : 0)
    const cw = w - PAD - x0
    const st = STATUS[a.status]
    const running = isRunning(a)
    const mid = y0 + 19
    const time = fmtClock(elapsed(a.startedAt, a.endedAt, now))
    const statusText = `${L.status[a.status]} ${time}`
    const statusW = textWidth(statusText, 9.5, 0.16)
    const mono = monos.get(a.key) ?? '?'

    // Collegamento dal bus: in onda il tratteggio scorre verso l'operatore.
    body += running
      ? `<path class="a-flow" d="M${BUS_X} ${mid} H${x0}" stroke="${C.run}" stroke-width="1.5" stroke-dasharray="3 4" fill="none" style="${phase(now, DUR.flow)}"/>`
      : `<path d="M${BUS_X} ${mid} H${x0}" stroke="${C.frame}" stroke-width="1.5" fill="none"/>`

    const ticks = callsOf(a).slice(-Math.floor((cw - 150) / 7))
    const ticksSvg = ticks
      .map((c, k) =>
        `<rect x="${x0 + 14 + k * 7}" y="${y0 + 49}" width="5" height="7" rx="1.5" fill="${CATEGORY[c.category].color}"${c.isError ? ` stroke="${C.bad}"` : ''}/>`,
      )
      .join('')
    const ticksEnd = x0 + 14 + ticks.length * 7 + (ticks.length > 0 ? 6 : 0)
    const meta = [
      L.tools(a.tools),
      a.lastTool,
      a.model,
      a.isBackground ? L.agents.background : undefined,
    ].filter((x)              => x !== undefined && x !== '')

    const born = now - a.startedAt
    const ended = a.endedAt === undefined ? Infinity : now - a.endedAt
    const border = running ? C.run : a.status === 'failed' || a.status === 'killed' ? C.bad : C.frame

    body +=
      `<g class="hov${born < DUR.rise * 2 ? ' a-rise' : ''}"${born < DUR.rise * 2 ? ` style="${since(born)}"` : ''}>` +
      `<title>${esc(`${mono} · ${a.type} — ${a.description}\n${L.status[a.status].toLowerCase()} · ${time} · ${L.tools(a.tools)}${a.model ? ` · ${a.model}` : ''}`)}</title>` +
      `<rect class="lift" x="${x0}" y="${y0}" width="${cw}" height="${CARD_H}" rx="8" fill="${C.raised}" stroke="${border}" stroke-opacity="${running ? 0.55 : 1}"/>` +
      // In onda: una luce scorre sul bordo superiore della scheda.
      (running
        ? `<clipPath id="card${i}"><rect x="${x0}" y="${y0}" width="${cw}" height="${CARD_H}" rx="8"/></clipPath>` +
          `<g clip-path="url(#card${i})"><rect class="a-scan motion" x="${x0 - cw}" y="${y0}" width="${cw * 2}" height="2" fill="url(#scan)" style="${phase(now + i * 700, DUR.scan)}"/></g>`
        : '') +
      // Appena finito: il bordo lampeggia del colore d'esito e si spegne.
      (ended < DUR.flash
        ? `<rect class="a-flash motion" x="${x0}" y="${y0}" width="${cw}" height="${CARD_H}" rx="8" fill="none" stroke="${st.color}" stroke-width="2" style="${since(ended)}"/>`
        : '') +
      badge(x0 + 19, y0 + 19, 10, mono, a.status, now) +
      `<text class="ink" x="${x0 + 37}" y="${y0 + 23}" style="font-weight:600">${esc(fit(a.type, cw - statusW - 60, 11))}</text>` +
      `<text class="cap" x="${x0 + cw - 12}" y="${y0 + 23}" text-anchor="end" style="fill:${st.color}">${statusText}</text>` +
      `<text x="${x0 + 14}" y="${y0 + 41}">${esc(fit(a.description, cw - 28))}</text>` +
      ticksSvg +
      `<text class="dim small" x="${ticksEnd}" y="${y0 + 56}">${esc(fitParts(meta, x0 + cw - 12 - ticksEnd, 10))}</text>` +
      `</g>`
  })

  let h = firstY + shown.length * ROW + 4
  if (hidden > 0) {
    body += `<text class="dim small" x="${BUS_X + 16}" y="${h + 6}">${esc(L.agents.earlier(hidden))}</text>`
    h += 18
  }
  return doc(w, h, body, L.agents.alt(liveCount, ordered.length))
}

// ── Skill: chip in flusso, attive in ambra ───────────────────────────────────

export const skillsSvg = (s               , now        , w        , L         )         => {
  const uses = s.skills.reduce((sum, k) => sum + k.count, 0)
  let body = head(w, L.skills.title, s.skills.length === 0 ? '' : L.skills.counts(s.skills.length, uses))
  if (s.skills.length === 0) {
    body += emptyLine(w, BODY_Y + 12, L.skills.empty)
    return doc(w, BODY_Y + 30, body, L.skills.altEmpty)
  }
  const chipH = 26
  const gap = 8
  let x = PAD
  let y = BODY_Y - 6
  for (const k of s.skills) {
    const isActive = k.turn === s.turn.count && s.turn.count > 0
    const name = fit(k.name, w - PAD * 2 - 60)
    const count = k.count > 1 ? `×${k.count}` : ''
    const cw = 22 + textWidth(name, 11) + (count === '' ? 0 : textWidth(count, 10) + 6) + (isActive ? 12 : 0)
    if (x + cw > w - PAD && x > PAD) {
      x = PAD
      y += chipH + gap
    }
    const tx = x + 11 + (isActive ? 12 : 0)
    // Appena caricata: la chip entra in scena (anche quando una skill già usata torna in testa).
    const age = now - k.lastAt
    const isFresh = age < DUR.pop * 2
    body +=
      `<g${isFresh ? ` class="a-pop" style="${since(age)}"` : ''}><title>${esc(`${k.name} — ${L.skills.loaded(k.count)}${isActive ? ` · ${L.skills.thisTurn}` : ''}`)}</title>` +
      `<rect x="${x}" y="${y}" width="${cw}" height="${chipH}" rx="${chipH / 2}" fill="${C.raised}" stroke="${isActive ? C.run : C.frame}" stroke-opacity="${isActive ? 0.8 : 1}"/>` +
      (isActive
        ? `<circle class="a-breathe" cx="${x + 14}" cy="${y + chipH / 2}" r="3" fill="${C.run}" style="${phase(now, DUR.breathe * 2)}"/>`
        : '') +
      `<text class="${isActive ? 'ink' : ''}" x="${tx}" y="${y + 17}">${esc(name)}</text>` +
      (count === '' ? '' : `<text class="dim small" x="${tx + textWidth(name, 11) + 6}" y="${y + 17}">${count}</text>`) +
      `</g>`
    x += cw + gap
  }
  const h = y + chipH + 14
  return doc(w, h, body, L.skills.alt(s.skills.length, s.skills.map(k => k.name).join(', ')))
}

// ── Attività: corsie nel tempo, una per operatore ────────────────────────────

export const timelineSvg = (s               , now        , w        , L         )         => {
  const first = s.calls[0]?.startedAt ?? now
  const span = Math.min(5 * 60_000, Math.max(60_000, now - first))
  const start = now - span
  const visible = s.calls.filter(c => (c.endedAt ?? now) >= start)
  const spanLabel = L.timeline.last(fmtSpan(span >= 5 * 60_000 ? 5 * 60_000 : span, L).toUpperCase())
  let body = head(w, L.timeline.title, spanLabel)

  if (visible.length === 0) {
    body += emptyLine(w, BODY_Y + 12, L.timeline.empty)
    return doc(w, BODY_Y + 30, body, L.timeline.altEmpty)
  }

  // Corsie: principale + i subagenti con chiamate nella finestra, in ordine di prima
  // chiamata (stabile: una corsia non salta di posto mentre si lavora). Massimo 5.
  const firstSeen = new Map                ()
  for (const c of visible) {
    if (c.agentId !== undefined) {
      firstSeen.set(c.agentId, Math.min(firstSeen.get(c.agentId) ?? c.startedAt, c.startedAt))
    }
  }
  const laneIds                         = [
    undefined,
    ...[...firstSeen.entries()].sort((a, b) => a[1] - b[1]).slice(-5).map(([id]) => id),
  ]
  const labelW = Math.min(120, Math.max(112, w * 0.3))
  const plotX = PAD + labelW
  const plotW = w - PAD - plotX
  const laneH = 20
  const top = BODY_Y - 4
  const xOf = (t        )         => plotX + ((t - start) / span) * plotW
  const plotH = laneIds.length * laneH

  // Griglia fissa rispetto a "ora": un tratto al minuto (ogni 15 s sotto i 2 minuti).
  const step = span > 120_000 ? 60_000 : 15_000
  for (let t = now; t >= start; t -= step) {
    const x = xOf(t)
    body += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotH}" stroke="${C.grid}"/>`
    const ago = now - t
    const label = ago === 0 ? L.timeline.now : ago >= 60_000 ? `-${ago / 60_000}m` : `-${ago / 1000}s`
    body += `<text class="dim" x="${x}" y="${top + plotH + 13}" text-anchor="${ago === 0 ? 'end' : 'middle'}" style="font-size:9.5px">${label}</text>`
  }

  let bars = ''
  const monos = monograms(s.agents)
  laneIds.forEach((id, i) => {
    const y = top + i * laneH
    const agent = id === undefined ? undefined : s.agents.find(a => a.agentId === id)
    const name = id === undefined
      ? L.timeline.main
      : agent === undefined ? id.slice(0, 8) : `${monos.get(agent.key) ?? '?'} ${agent.type}`
    const color = id === undefined
      ? (s.turn.isWorking ? C.run : C.ink3)
      : STATUS[agent?.status ?? 'running'].color
    body +=
      (i > 0 ? `<line x1="${PAD}" y1="${y}" x2="${w - PAD}" y2="${y}" stroke="${C.grid}"/>` : '') +
      `<circle cx="${PAD + 3}" cy="${y + laneH / 2}" r="2.5" fill="${color}"/>` +
      `<text class="small" x="${PAD + 11}" y="${y + laneH / 2 + 3.5}">${esc(fit(name, labelW - 18, 10))}</text>`

    for (const c of visible.filter(v => v.agentId === id)) {
      const x = xOf(c.startedAt)
      const end = c.endedAt ?? now
      const bw = Math.max(3, xOf(end) - x)
      const isLive = c.endedAt === undefined
      const fill = CATEGORY[c.category].color
      bars +=
        `<g><title>${esc(`${c.tool.startsWith('mcp__') ? c.label : c.tool}${c.label && !c.tool.startsWith('mcp__') ? ` · ${c.label}` : ''}\n${isLive ? L.timeline.running : fmtSpan(end - c.startedAt, L)}${c.isError ? ` · ${L.timeline.error}` : ''} · ${name}`)}</title>` +
        `<rect${isLive ? ` class="a-breathe" style="${phase(now, DUR.breathe * 2)}"` : ''} x="${x}" y="${y + 5}" width="${bw}" height="10" rx="2" fill="${fill}" stroke="${C.screen}" stroke-width="1"/>` +
        (c.isError ? `<path d="M${x + bw / 2 - 3.5} ${y + 3} h7 l-3.5 -4 z" fill="${C.bad}"/>` : '') +
        `<rect class="hit" x="${x - 2}" y="${y}" width="${bw + 4}" height="${laneH}"/></g>`
    }
  })

  // Le barre scorrono verso sinistra alla velocità reale del tempo: tra un ridisegno e
  // l'altro arrivano esattamente dove il ridisegno successivo le riposiziona.
  const drift = -(plotW / span) * DUR.sweep
  body +=
    `<clipPath id="plot"><rect x="${plotX - 1}" y="${top - 6}" width="${plotW + 2}" height="${plotH + 8}"/></clipPath>` +
    `<g clip-path="url(#plot)"><g class="a-drift" style="--drift:${drift.toFixed(2)}px">${bars}</g></g>`

  // Legenda: solo le categorie presenti, in ordine fisso.
  let y = top + plotH + 32
  let x = PAD
  const present = CATEGORY_ORDER.filter(cat => visible.some(c => c.category === cat))
  for (const cat of present) {
    const label = L.category[cat]
    const lw = 14 + textWidth(label, 10) + 14
    if (x + lw > w - PAD) {
      x = PAD
      y += 16
    }
    body += swatch(x, y - 8, CATEGORY[cat].color) + `<text class="small" x="${x + 13}" y="${y}">${label}</text>`
    x += lw
  }
  const h = y + 14
  return doc(w, h, body, L.timeline.alt(visible.length, laneIds.length))
}

// ── Strumenti: classifica orizzontale ────────────────────────────────────────

export const toolsSvg = (
  s               ,
  w        ,
  categoryOf                                 ,
  nameOf                          ,
  L         ,
)         => {
  const entries = Object.entries(s.toolCounts).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, n]) => sum + n, 0)
  let body = head(
    w,
    L.toolsBoard.title,
    total === 0 ? '' : L.toolsBoard.counts(total, s.errorCount),
    s.errorCount > 0 ? C.bad : C.ink3,
  )
  if (entries.length === 0) {
    body += emptyLine(w, BODY_Y + 12, L.toolsBoard.empty)
    return doc(w, BODY_Y + 30, body, L.toolsBoard.altEmpty)
  }
  const top = entries.slice(0, 8)
  const max = top[0]?.[1] ?? 1
  const labelW = Math.min(150, w * 0.34)
  const barX = PAD + labelW
  const barMax = w - PAD - barX - 40
  const rowH = 21
  top.forEach(([tool, n], i) => {
    const y = BODY_Y + i * rowH
    const bw = Math.max(4, (n / max) * barMax)
    body +=
      `<g class="hov"><title>${esc(`${tool} — ${L.calls(n)}`)}</title>` +
      `<rect class="hit" x="${PAD}" y="${y - 4}" width="${w - PAD * 2}" height="${rowH}"/>` +
      `<text x="${PAD}" y="${y + 9}">${esc(fit(nameOf(tool), labelW - 12))}</text>` +
      `<rect x="${barX}" y="${y + 1}" width="${bw}" height="9" rx="2" fill="${CATEGORY[categoryOf(tool)].color}"/>` +
      `<text class="num" x="${barX + bw + 8}" y="${y + 10}" style="font-size:14px">${n}</text></g>`
  })
  let h = BODY_Y + top.length * rowH + 6
  if (entries.length > top.length) {
    const rest = entries.slice(top.length).reduce((sum, [, n]) => sum + n, 0)
    const others = entries.length - top.length
    body += `<text class="dim small" x="${PAD}" y="${h + 4}">${esc(L.toolsBoard.more(others, rest))}</text>`
    h += 18
  }
  return doc(w, h, body, L.toolsBoard.alt(top.map(([t, n]) => `${t} ${n}`).join(', ')))
}

// ── File toccati ─────────────────────────────────────────────────────────────

export const filesSvg = (s               , now        , w        , L         )         => {
  const files = s.files.slice(0, 8)
  const edited = s.files.filter(f => f.edits > 0).length
  let body = head(w, L.files.title, s.files.length === 0 ? '' : L.files.counts(edited, s.files.length))
  if (files.length === 0) {
    body += emptyLine(w, BODY_Y + 12, L.files.empty)
    return doc(w, BODY_Y + 30, body, L.files.altEmpty)
  }
  const rowH = 20
  files.forEach((f, i) => {
    const y = BODY_Y + i * rowH
    const parts = f.path.split('/').filter(Boolean)
    const name = parts.pop() ?? f.path
    const dir = parts.slice(-2).join('/')
    const counts = [f.edits > 0 ? L.files.edits(f.edits) : '', f.reads > 0 ? L.files.reads(f.reads) : '']
      .filter(Boolean)
      .join(' · ')
    const nameW = Math.min(textWidth(name, 11), w * 0.45)
    const color = f.edits > 0 ? CATEGORY.write.color : CATEGORY.read.color
    const age = now - f.lastAt
    body +=
      `<g><title>${esc(`${f.path}\n${counts}`)}</title>` +
      // Appena toccato: la riga si accende del colore dell'operazione e sfuma.
      (age < DUR.flash
        ? `<rect class="a-flash motion" x="${PAD - 6}" y="${y - 5}" width="${w - PAD * 2 + 12}" height="${rowH - 2}" rx="5" fill="${color}" fill-opacity=".16" style="${since(age)}"/>`
        : '') +
      swatch(PAD, y, color) +
      `<text class="ink" x="${PAD + 14}" y="${y + 8}">${esc(fit(name, w * 0.45))}</text>` +
      `<text class="dim small" x="${PAD + 22 + nameW}" y="${y + 8}">${esc(fit(dir, w - PAD * 2 - nameW - 110, 10))}</text>` +
      `<text class="dim small" x="${w - PAD}" y="${y + 8}" text-anchor="end">${counts}</text></g>`
  })
  const h = BODY_Y + files.length * rowH + 6
  return doc(w, h, body, L.files.alt(s.files.length))
}
