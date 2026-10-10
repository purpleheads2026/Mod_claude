// Anteprima della Regia fuori da Claude Code. Converte hooks/*.ts in moduli ES
// (type stripping di Node, nessuna dipendenza) dentro preview/.cache/ e scrive:
//   preview/index.html  la parete statica a due larghezze, compatta e vuota
//   preview/live.html   una sessione simulata in tempo reale, ridisegnata ogni secondo
//                       come fa il desktop (ogni monitor è un'immagine): serve a
//                       verificare il motion tra i ridisegni
//
//   node preview/build.mjs      poi servire preview/ (vedi .claude/launch.json)
//
// Non fa parte del mod caricato: l'engine legge solo hooks/.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { buildScenario } from './scenario.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const hooks = join(here, '..', 'hooks')
const cache = join(here, '.cache')
mkdirSync(cache, { recursive: true })

// Ogni .ts di hooks/ diventa .cache/<nome>.mjs, con gli import relativi riscritti.
for (const file of readdirSync(hooks).filter(f => f.endsWith('.ts'))) {
  const source = stripTypeScriptTypes(readFileSync(join(hooks, file), 'utf8'))
  writeFileSync(join(cache, file.replace(/\.ts$/, '.mjs')), source.replace(/from '\.\/([\w-]+)'/g, "from './$1.mjs'"))
}

const load = name => import(`${pathToFileURL(join(cache, `${name}.mjs`)).href}?t=${Date.now()}`)
const M = await load('model')
const S = await load('svg')
const R = await load('radar')

const NOW = Date.parse('2026-10-10T10:30:00Z')
const s = buildScenario(M, NOW)
const empty = M.emptySnapshot(NOW - 20_000)

const stack = (snap, w, isCompact = false) =>
  [
    R.radarSvg(snap, NOW, w),
    ...(isCompact ? [] : [S.metersSvg(snap, NOW, w)]),
    S.agentsSvg(snap, NOW, w, isCompact),
    S.skillsSvg(snap, NOW, w),
    ...(isCompact
      ? []
      : [S.timelineSvg(snap, NOW, w), S.toolsSvg(snap, w, M.categorize, M.toolName), S.filesSvg(snap, NOW, w)]),
  ]
    .map(svg => `<div class="mon">${svg}</div>`)
    .join('\n')

const column = (title, snap, w, isCompact) =>
  `<section style="width:${w}px"><h2>${title}</h2>${stack(snap, w, isCompact)}</section>`

const page = (title, body, script = '') => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  :root{color-scheme:light dark;--bg:#ECEAE4;--ink:#2B2A27}
  @media (prefers-color-scheme:dark){:root{--bg:#0E0F12;--ink:#C9C5BB}}
  body{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:12px ui-monospace,'SF Mono',Menlo,monospace}
  main{display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap}
  h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 10px;font-weight:600;opacity:.7}
  .mon{margin-bottom:8px;line-height:0}
  .mon svg,.mon img{max-width:100%;height:auto;display:block}
  .mon iframe{border:0;display:block;max-width:100%}
</style></head><body>${body}${script}</body></html>`

writeFileSync(
  join(here, 'index.html'),
  page(
    'Regia · anteprima',
    `<main>
${column('Pannello · 380 px', s, 380, false)}
${column('Pannello · 520 px', s, 520, false)}
${column('Compatto · 380 px', s, 380, true)}
${column('Prima apertura · 380 px', empty, 380, false)}
</main>`,
  ),
)

// Pagina live: stessa logica del pannello, nel browser, con un orologio vero.
const live = `<script type="module">
import * as M from './.cache/model.mjs'
import * as S from './.cache/svg.mjs'
import * as R from './.cache/radar.mjs'
import { buildScenario, simulate } from './scenario.mjs'

const W = Number(new URLSearchParams(location.search).get('w') ?? 400)
let snap = buildScenario(M, Date.now())
const monitors = [
  ['radar', 'img', now => R.radarSvg(snap, now, W)],
  ['meters', 'img', now => S.metersSvg(snap, now, W)],
  ['agents', 'img', now => S.agentsSvg(snap, now, W)],
  ['skills', 'img', now => S.skillsSvg(snap, now, W)],
  ['timeline', 'img', now => S.timelineSvg(snap, now, W)],
  ['tools', 'img', () => S.toolsSvg(snap, W, M.categorize, M.toolName)],
  ['files', 'img', now => S.filesSvg(snap, now, W)],
]
const root = document.querySelector('#wall')
root.style.width = W + 'px'
const slots = monitors.map(([key, kind]) => {
  const box = document.createElement('div')
  box.className = 'mon'
  const el = document.createElement(kind === 'img' ? 'img' : 'iframe')
  if (kind === 'frame') el.setAttribute('sandbox', '')
  box.append(el)
  root.append(box)
  return { el, kind, last: '' }
})
let reloads = 0
const draw = () => {
  const now = Date.now()
  monitors.forEach(([, , make], i) => {
    const svg = make(now)
    const slot = slots[i]
    if (svg === slot.last) return
    slot.last = svg
    if (slot.kind === 'img') slot.el.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    else {
      reloads += 1
      const m = svg.match(/width="(\\d+)" height="(\\d+)"/)
      slot.el.width = m[1]; slot.el.height = m[2]
      slot.el.srcdoc = '<!doctype html><style>html,body{margin:0;background:transparent}</style>' + svg
    }
  })
  document.querySelector('#stat').textContent = 'ricariche iframe: ' + reloads
}
const apply = fn => { snap = fn(snap); draw() }
simulate(M, apply)
draw()
setInterval(draw, 1000)
</script>`

writeFileSync(
  join(here, 'live.html'),
  page('Regia · live', `<h2>Sessione simulata · ridisegno ogni secondo · <span id="stat"></span></h2><div id="wall"></div>`, live),
)

console.log('preview/index.html e preview/live.html scritti')
