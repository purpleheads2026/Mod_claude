// Vetrina GitHub di Regia, generata dai sorgenti veri del plugin (in inglese).
//
//   node scripts/showcase.mjs
//
// Scrive in docs/:
//   demo/lib/*.mjs     hooks/*.ts convertiti (type stripping di Node) + lo scenario finto
//   media/hero.svg     testata animata del README: titolo + radar
//   media/wall.svg     la parete dei monitor (radar, agenti, strumentazione, skill)
//   media/anatomy.svg  il radar con le didascalie delle sue parti
// docs/index.html (la pagina di GitHub Pages con la demo live) è scritta a mano e
// importa i moduli da demo/lib.
//
// Le immagini sono SVG animati in loop: rotazione del radar e dissolvenza delle tracce
// hanno lo stesso periodo (60 s), quindi rendendo infinita la dissolvenza ogni traccia
// si riaccende proprio quando ripassa dalla lancetta. Le chiamate in corso dello
// scenario vengono chiuse, perché una testa "in corso" ferma non tornerebbe in loop.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const hooks = join(root, 'regia', 'hooks')
const docs = join(root, 'docs')
const lib = join(docs, 'demo', 'lib')
const media = join(docs, 'media')
mkdirSync(lib, { recursive: true })
mkdirSync(media, { recursive: true })

for (const file of readdirSync(hooks).filter(f => f.endsWith('.ts'))) {
  const out = stripTypeScriptTypes(readFileSync(join(hooks, file), 'utf8'))
  writeFileSync(join(lib, file.replace(/\.ts$/, '.mjs')), out.replace(/from '\.\/([\w-]+)'/g, "from './$1.mjs'"))
}
// Lo scenario del plugin ha testi in italiano (è nato per l'anteprima di sviluppo): la
// vetrina è in inglese, quindi nella copia li traduciamo. regia/ resta intatto.
const EN = {
  'turno precedente': 'previous turn',
  'vorrei modificare l’interfaccia di code: una vista grafica per tenere sotto controllo agenti e skill': 'I want a graphic view of agents and skills',
  'Controllo rapido (annullato)': 'Quick check (cancelled)',
  'Mappa gli eventi dell’API dei mod e i loro input': 'Map the mod API events and their inputs',
  'Screenshot del pannello, critica e correzioni': 'Screenshot the panel, critique, fix',
  'Confronta il rendering SVG su desktop e terminale': 'Compare SVG rendering on desktop and terminal',
  'Rivedi la UI del pannello': 'Review the panel UI',
  'Cerca dove nasce il flicker degli iframe': 'Find where the iframe flicker starts',
  'Critica il radar a 380 px': 'Critique the radar at 380 px',
  'Misura la larghezza reale del pannello': 'Measure the real panel width',
  'Controllo rapido dei metadati': 'Quick metadata check',
}
let scenario = readFileSync(join(root, 'regia', 'preview', 'scenario.mjs'), 'utf8')
for (const [it, en] of Object.entries(EN)) scenario = scenario.replaceAll(it, en)
writeFileSync(join(lib, 'scenario.mjs'), scenario)

const load = name => import(pathToFileURL(join(lib, name)).href)
const M = await load('model.mjs')
const S = await load('svg.mjs')
const R = await load('radar.mjs')
const I = await load('i18n.mjs')
const { buildScenario } = await load('scenario.mjs')

const L = I.STRINGS.en
const C = S.C
const NOW = Date.parse('2026-10-10T10:30:00Z')

let s = buildScenario(M, NOW)
for (const c of s.calls) if (c.endedAt === undefined) s = M.callEnded(s, c.id, NOW - 250, false)

const MONO = `ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace`
const NUM = `'DIN Alternate','DIN Condensed','Bahnschrift',ui-monospace,monospace`
const LOOP = '.a-fade{animation-iteration-count:infinite}.a-drift{animation:none}'

const HEADER = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="([\d.]+)" height="([\d.]+)" viewBox="[^"]*" role="img" aria-label="[^"]*">/
const sizeOf = svg => {
  const m = HEADER.exec(svg)
  if (m === null) throw new Error('monitor senza intestazione attesa')
  return [Number(m[1]), Number(m[2])]
}
/** Un monitor dentro un altro SVG: stessa sorgente, nuova posizione e (volendo) un ritaglio. */
const nest = (svg, x, y, view) => {
  const [w, h] = sizeOf(svg)
  const [vx, vy, vw, vh] = view ?? [0, 0, w, h]
  return svg.replace(HEADER, `<svg x="${x}" y="${y}" width="${vw}" height="${vh}" viewBox="${vx} ${vy} ${vw} ${vh}" overflow="hidden">`)
}
const text = (x, y, value, style, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" style="${style}">${S.esc(value)}</text>`
const svgDoc = (w, h, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${S.esc(label)}"><style>${LOOP}</style>${body}</svg>\n`

/** Ritaglio del solo quadrante: niente intestazione né righe sotto. */
const dialView = w => {
  const g = R.radarGeometry(w, 1)
  // In basso si ferma sotto l'etichetta "30s", prima della riga "cosa gira adesso".
  return [g.cx - g.rOut - 34, g.cy - g.rOut - 28, 2 * (g.rOut + 34), 2 * g.rOut + 50]
}

// ── hero.svg ─────────────────────────────────────────────────────────────────
{
  const W = 960
  const H = 440
  const view = dialView(520)
  const features = [
    [C.run, 'Subagents orbiting the core'],
    [S.CATEGORY.read.color, 'Every tool call, live on the radar'],
    [S.CATEGORY.write.color, 'Context and usage limits at a glance'],
  ]
  const body =
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${C.screen}" stroke="${C.frame}"/>` +
    `<rect x="56" y="60" width="28" height="2" rx="1" fill="${C.run}"/>` +
    text(56, 92, 'CLAUDE CODE PLUGIN', `font:600 12px ${MONO};letter-spacing:.24em;fill:${C.ink3}`) +
    text(50, 184, 'Regia', `font:400 100px ${NUM};fill:${C.ink}`) +
    text(56, 232, 'A live control room for', `font:400 22px ${MONO};fill:${C.ink}`) +
    text(56, 262, 'your Claude Code sessions.', `font:400 22px ${MONO};fill:${C.ink2}`) +
    features
      .map(([color, label], i) =>
        `<rect x="56" y="${312 + i * 28}" width="9" height="9" rx="2" fill="${color}"/>` +
        text(76, 321 + i * 28, label, `font:400 14px ${MONO};fill:${C.ink2}`),
      )
      .join('') +
    text(56, 404, 'DESKTOP CODE TAB  ·  ENGLISH / ITALIAN', `font:400 10px ${MONO};letter-spacing:.2em;fill:${C.ink3}`) +
    nest(R.radarSvg(s, NOW, 520, L), W - view[2] - 20, (H - view[3]) / 2, view)
  writeFileSync(join(media, 'hero.svg'), svgDoc(W, H, 'Regia: a live control room for Claude Code', body))
}

// ── wall.svg ─────────────────────────────────────────────────────────────────
{
  const w = 440
  const gap = 20
  const radar = R.radarSvg(s, NOW, w, L)
  const skills = S.skillsSvg(s, NOW, w, L)
  const agents = S.agentsSvg(s, NOW, w, false, L)
  const meters = S.metersSvg(s, NOW, w, L)
  const [, hRadar] = sizeOf(radar)
  const [, hSkills] = sizeOf(skills)
  const [, hAgents] = sizeOf(agents)
  const [, hMeters] = sizeOf(meters)
  const W = w * 2 + gap
  const H = Math.max(hRadar + gap + hSkills, hAgents + gap + hMeters)
  const body =
    nest(radar, 0, 0) +
    nest(skills, 0, H - hSkills) +
    nest(agents, w + gap, 0) +
    nest(meters, w + gap, hAgents + gap)
  writeFileSync(join(media, 'wall.svg'), svgDoc(W, H, 'The Regia panel: radar, agents, instruments and skills', body))
}

// ── anatomy.svg ──────────────────────────────────────────────────────────────
{
  const w = 440
  const radar = R.radarSvg(s, NOW, w, L)
  // Le corsie le conta radar.ts allo stesso modo: principale + operatori attivi nell'ultimo minuto.
  const recent = s.calls.filter(c => NOW - (c.endedAt ?? NOW) < 60_000)
  const lanes = 1 + [...s.agents]
    .sort((a, b) => a.startedAt - b.startedAt)
    .filter(a => S.isRunning(a) || recent.some(c => c.agentId !== undefined && c.agentId === a.agentId))
    .slice(-3).length
  const g = R.radarGeometry(w, lanes)
  const view = dialView(w)
  const W = 960
  const H = 480
  const X0 = (W - view[2]) / 2
  const Y0 = (H - view[3]) / 2
  const map = ([x, y]) => [X0 + x - view[0], Y0 + y - view[1]]

  // Un satellite in corso sul lato destro (slot fra 0° e 180°), dove sta la sua didascalia.
  const born = [...s.agents].sort((x, y) => x.startedAt - y.startedAt)
  const rightSide = born
    .map((a, i) => ({ a, i, x: g.satellite(i)[0] }))
    .filter(({ x }) => x > g.cx)
  const satIndex = (rightSide.find(({ a }) => S.isRunning(a)) ?? rightSide[0] ?? { i: 0 }).i
  // Righe di al massimo 28 caratteri: a 12 px mono stanno nei ~210 px ai lati del quadrante.
  const callouts = [
    { side: 'right', y: 74, at: [g.cx, g.cy - g.rOut - 2], title: 'NOW', lines: ['Every call is born here,', 'then sweeps by at 6°/s.'] },
    { side: 'right', y: 196, at: g.satellite(satIndex), title: 'SATELLITES', lines: ['Subagents in fixed orbits,', 'beaming while they work.'] },
    { side: 'right', y: 330, at: g.at(g.rGauge, 150), title: 'CONTEXT RING', lines: ['How full the context is,', 'grown from the last read.'] },
    { side: 'left', y: 150, at: g.at(g.laneR(0), 300), title: 'TOOL TRACKS', lines: ['The last 60 s of calls,', 'one track per agent.'] },
    { side: 'left', y: 300, at: [g.cx - g.rCore * 0.9, g.cy + 8], title: 'THE CORE', lines: ['The main session: status,', 'turn timer, context used.'] },
  ]
  let marks = ''
  for (const c of callouts) {
    const [tx, ty] = map(c.at)
    const isRight = c.side === 'right'
    const elbowX = isRight ? X0 + view[2] + 6 : X0 - 6
    const endX = isRight ? elbowX + 18 : elbowX - 18
    const textX = isRight ? endX + 8 : endX - 8
    const anchor = isRight ? 'start' : 'end'
    marks +=
      `<path d="M${tx.toFixed(1)} ${ty.toFixed(1)}L${elbowX} ${c.y - 4}H${endX}" fill="none" stroke="${C.ink3}" stroke-width="1"/>` +
      `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="3.5" fill="${C.run}" stroke="${C.screen}" stroke-width="2"/>` +
      text(textX, c.y, c.title, `font:600 11px ${MONO};letter-spacing:.18em;fill:${C.ink}`, anchor) +
      c.lines.map((line, i) => text(textX, c.y + 19 + i * 17, line, `font:400 12px ${MONO};fill:${C.ink2}`, anchor)).join('')
  }
  const body =
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${C.screen}" stroke="${C.frame}"/>` +
    nest(radar, X0, Y0, view) +
    marks
  writeFileSync(join(media, 'anatomy.svg'), svgDoc(W, H, 'Anatomy of the Regia radar', body))
}

console.log('docs/ aggiornata: demo/lib/*.mjs, media/{hero,wall,anatomy}.svg (docs/index.html è scritta a mano)')
