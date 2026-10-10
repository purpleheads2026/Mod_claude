// Motion della Regia: keyframes CSS e helper di fase, condivisi da tutti i monitor.
//
// Il problema: ogni ridisegno sostituisce il documento SVG e le animazioni ripartono
// da zero. La soluzione: ogni animazione è agganciata all'orologio reale con un
// `animation-delay` negativo.
//   - eventi (`since`): delay = -(ora - istante dell'evento). Un'entrata di 280 ms
//     scattata 5 s fa è già finita (fill `both`); una scattata 100 ms fa riparte da lì.
//   - cicli (`phase`): delay = -(ora mod periodo). Tutti i cicli con lo stesso periodo
//     sono in fase tra loro e tra un ridisegno e l'altro: niente scatti.
//
// Regole verificate sul rendering come immagine (Chrome):
//   - keyframes sempre con `from` esplicito: quello implicito eredita il transform di
//     base dell'elemento (attributo o --rot) e la fase si sommerebbe due volte;
//   - niente transform-origin in px su un elemento animato in transform: gruppi
//     annidati con translate, o transform-box: fill-box per ruotare/scalare sul centro.
// Solo transform e opacity (più stroke-dashoffset per i flussi). Curve dai token:
// uscita cubic-bezier(.23,1,.32,1), movimento cubic-bezier(.77,0,.175,1), tempo linear.
// Reduced motion: cade ogni movimento (rotazioni, flussi, entrate, onde); restano le
// dissolvenze di opacità, che aiutano a leggere l'età dei dati.

export const EASE_OUT = 'cubic-bezier(.23,1,.32,1)'
export const EASE_IN_OUT = 'cubic-bezier(.77,0,.175,1)'

/** Durate in ms: i valori di design-tokens.json → motion.duration. */
export const DUR = {
  rise: 240,
  pop: 280,
  ripple: 700,
  burst: 900,
  flash: 1200,
  grow: 700,
  breathe: 1200,
  ping: 1600,
  flow: 800,
  scan: 2400,
  orbit: 6000,
  sweep: 60_000,
}         

const s = (ms        )         => `${(ms / 1000).toFixed(3)}s`

/** Stile inline che porta un'animazione d'evento al punto giusto: `age` ms dopo l'evento. */
export const since = (age        )         => `animation-delay:-${s(Math.max(0, age))}`

/** Stile inline che mette un ciclo in fase con l'orologio reale. */
export const phase = (now        , period        )         => `animation-delay:-${s(now % period)}`

export const motionCss = `
@keyframes rx-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes rx-pop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}
@keyframes rx-rise{from{transform:translateY(6px);opacity:0}to{transform:none;opacity:1}}
@keyframes rx-ripple{from{transform:scale(1);opacity:.55}to{transform:scale(1.9);opacity:0}}
@keyframes rx-burst{from{transform:scale(1);opacity:.9}to{transform:scale(2.8);opacity:0}}
@keyframes rx-ping{from{transform:scale(1);opacity:.7}to{transform:scale(2.6);opacity:0}}
@keyframes rx-fade{from{opacity:1}to{opacity:0}}
@keyframes rx-flash{from{opacity:1}to{opacity:0}}
@keyframes rx-breathe{from{opacity:.35}to{opacity:1}}
@keyframes rx-flow{to{stroke-dashoffset:-14}}
@keyframes rx-grow{from{transform:scaleX(var(--from,0))}to{transform:none}}
@keyframes rx-scan{from{transform:translateX(0)}to{transform:translateX(50%)}}
@keyframes rx-drift{to{transform:translateX(var(--drift,0px))}}
@keyframes rx-dash{from{stroke-dashoffset:var(--from,0)}}
.box{transform-box:fill-box;transform-origin:center}
.a-spin{transform:rotate(var(--rot,0deg));animation:rx-spin ${DUR.sweep}ms linear infinite}
.a-orbit{animation:rx-spin ${DUR.orbit}ms linear infinite;transform-box:fill-box;transform-origin:center}
.a-pop{animation:rx-pop ${DUR.pop}ms ${EASE_OUT} both;transform-box:fill-box;transform-origin:center}
.a-rise{animation:rx-rise ${DUR.rise}ms ${EASE_OUT} both}
.a-ripple{animation:rx-ripple ${DUR.ripple}ms ${EASE_OUT} both;transform-box:fill-box;transform-origin:center;opacity:0}
.a-burst{animation:rx-burst ${DUR.burst}ms ${EASE_OUT} both;transform-box:fill-box;transform-origin:center;opacity:0}
.a-ping{animation:rx-ping ${DUR.ping}ms ${EASE_OUT} infinite;transform-box:fill-box;transform-origin:center;opacity:0}
.a-fade{animation:rx-fade ${DUR.sweep}ms linear both}
.a-flash{animation:rx-flash ${DUR.flash}ms ${EASE_OUT} both;opacity:0}
.a-breathe{animation:rx-breathe ${DUR.breathe}ms ${EASE_IN_OUT} infinite alternate}
.a-flow{animation:rx-flow ${DUR.flow}ms linear infinite}
.a-grow{animation:rx-grow ${DUR.grow}ms ${EASE_OUT} both;transform-box:fill-box;transform-origin:left center}
.a-scan{animation:rx-scan ${DUR.scan}ms ${EASE_IN_OUT} infinite;transform-box:fill-box}
.a-drift{animation:rx-drift ${DUR.sweep}ms linear both}
.a-dash{animation:rx-dash ${DUR.grow}ms ${EASE_OUT} both}
@media (prefers-reduced-motion:reduce){
.motion{display:none}
.a-spin,.a-orbit,.a-pop,.a-rise,.a-flow,.a-grow,.a-dash,.a-scan,.a-drift,.a-breathe{animation:none}
}
`
