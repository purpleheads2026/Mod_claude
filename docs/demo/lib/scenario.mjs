// Scenari finti per l'anteprima, condivisi da build.mjs (Node, pagina statica) e da
// live.html (browser, simulazione in tempo reale). Usano solo i riduttori di model.ts.

/** Una sessione a metà: 18 minuti, turno 7 in onda da 42 s, 4 operatori. */
export const buildScenario = (M, NOW) => {
  const ago = sec => NOW - sec * 1000
  let s = M.emptySnapshot(ago(18 * 60))
  for (let i = 0; i < 6; i++) {
    s = M.turnStarted(s, ago(17 * 60 - i * 120), 'previous turn')
    s = M.turnCompleted(s, 70_000, { model: 'claude-opus-5-5', input_tokens: 9000, output_tokens: 6200, cache_read_input_tokens: 410_000 })
  }
  for (const k of ['plugin-authoring', 'dataviz', 'design-system-guardrails', 'plugin-authoring', 'artifact-design']) {
    s = M.skillLoaded(s, k, ago(400))
  }
  s = M.turnStarted(s, ago(42), 'I want a graphic view of agents and skills')

  const call = (id, tool, input, start, dur, agentId, isError = false) => {
    const c = M.makeCall(id, tool, input, ago(start), agentId)
    s = M.callStarted(s, c, M.filePathOf(input))
    if (dur !== null) s = M.callEnded(s, id, ago(start) + dur * 1000, isError)
  }
  const spawn = (key, agentId, type, description, start, model) => {
    s = M.agentSpawned(s, { key, type, description, isBackground: true, model }, ago(start))
    s = M.agentStarted(s, key, agentId, model)
  }

  spawn('t4', 'a4', 'seo-technical', 'Quick check (cancelled)', 180, 'sonnet')
  spawn('t1', 'a1', 'Explore', 'Map the mod API events and their inputs', 120, 'haiku')
  spawn('t2', 'a2', 'design-reviewer', 'Screenshot the panel, critique, fix', 50, 'opus')
  spawn('t3', 'a3', 'general-purpose', 'Compare SVG rendering on desktop and terminal', 34, 'sonnet')

  const events = [
    ['m1', 'Read', { file_path: '/Mod_claude/overview.md' }, 290, 0.4],
    ['x0', 'WebFetch', { url: 'https://example.com' }, 176, 2.0, 'a4', true],
    ['m2', 'Bash', { command: 'ls -la && cat overview.md' }, 160, 1.8],
    ['x1', 'Grep', { pattern: "'tool.call'" }, 115, 0.5, 'a1'],
    ['x2', 'Read', { file_path: '/types/claude-code.d.ts' }, 108, 1.1, 'a1'],
    ['m3', 'Grep', { pattern: 'ui.render' }, 100, 0.9],
    ['x3', 'Grep', { pattern: 'AgentInfo' }, 96, 0.4, 'a1'],
    ['m4', 'Skill', { skill: 'dataviz' }, 92, 0.6],
    ['x4', 'Read', { file_path: '/types/claude-code.d.ts' }, 88, 0.8, 'a1'],
    ['m5', 'Write', { file_path: '/regia/hooks/model.ts' }, 80, 0.3],
    ['x5', 'Bash', { command: 'wc -l claude-code.d.ts' }, 78, 0.6, 'a1'],
    ['m6', 'Write', { file_path: '/regia/hooks/svg.ts' }, 70, 0.4],
    ['m7', 'Edit', { file_path: '/regia/hooks/register.tsx' }, 62, 0.3],
    ['m8', 'Bash', { command: 'claude plugin validate regia' }, 56, 6.5, undefined, true],
    ['x6', 'mcp__Claude_Browser__computer', { action: 'screenshot' }, 46, 1.4, 'a2'],
    ['m9', 'Bash', { command: 'claude plugin test regia' }, 44, 4.2],
    ['x7', 'Read', { file_path: '/regia/hooks/register.tsx' }, 30, 0.6, 'a3'],
    ['x8', 'Read', { file_path: '/regia/hooks/svg.ts' }, 28, 0.5, 'a2'],
    ['x9', 'Grep', { pattern: 'Svg' }, 24, 0.3, 'a3'],
    ['m10', 'mcp__Claude_Browser__navigate', { url: 'http://localhost:4173' }, 22, 2.1],
    ['x10', 'Edit', { file_path: '/regia/hooks/svg.ts' }, 18, 0.4, 'a2'],
    ['x11', 'WebSearch', { query: 'SMIL animation in img element chromium' }, 14, 3.2, 'a3'],
    ['m11', 'WebFetch', { url: 'https://docs.example.dev/hooks' }, 12, 3.4],
    ['x12', 'mcp__Claude_Browser__computer', { action: 'screenshot' }, 8, 1.6, 'a2'],
    ['x13', 'Read', { file_path: '/regia/hooks/svg.ts' }, 4, null, 'a3'],
    ['x14', 'Bash', { command: 'node preview/build.mjs' }, 3, null, 'a2'],
    ['m12', 'Agent', { description: 'Review the panel UI' }, 2, null],
  ]
  for (const [id, tool, input, start, dur, agentId, err] of events) call(id, tool, input, start, dur, agentId, err)

  s = M.agentFinished(s, 'a1', ago(74), 'completed', 5400)
  s = M.agentFinished(s, 'a4', ago(172), 'failed')
  s = M.skillLoaded(s, 'dataviz', ago(30))
  s = M.skillLoaded(s, 'design-audit-playwright', ago(20))

  s = M.metersMeasured(s, {
    context: { tokens: 78_000, window: 200_000, percent: 39 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 58, resetsAt: new Date(NOW + 2.2 * 3600_000).toISOString() },
      { kind: 'seven_day', percentUsed: 79, resetsAt: new Date(NOW + 3.5 * 86400_000).toISOString() },
    ],
    cost: { usd: 4.61 },
  }, ago(60))
  s = M.metersMeasured(s, {
    context: { tokens: 86_400, window: 200_000, percent: 43 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 62, resetsAt: new Date(NOW + 2.2 * 3600_000).toISOString() },
      { kind: 'seven_day', percentUsed: 81, resetsAt: new Date(NOW + 3.5 * 86400_000).toISOString() },
    ],
    cost: { usd: 4.82 },
  }, ago(5))
  s = M.slicesMeasured(s, [
    { name: 'System prompt', tokens: 6200, kind: 'used' },
    { name: 'System tools', tokens: 14800, kind: 'used' },
    { name: 'MCP tools', tokens: 9100, kind: 'used' },
    { name: 'Custom agents', tokens: 2300, kind: 'used' },
    { name: 'Memory files', tokens: 1900, kind: 'used' },
    { name: 'Skills', tokens: 3100, kind: 'used' },
    { name: 'Messages', tokens: 49000, kind: 'used' },
    { name: 'Free space', tokens: 80600, kind: 'free' },
    { name: 'Autocompact buffer', tokens: 33000, kind: 'buffer' },
  ], 'claude-opus-5-5')
  return s
}

const TOOLS = [
  ['Read', () => ({ file_path: `/regia/hooks/${pick(['svg.ts', 'radar.ts', 'motion.ts', 'model.ts'])}` }), 0.2, 1.2],
  ['Grep', () => ({ pattern: pick(['ui.render', 'Svg', 'phase', 'agentId']) }), 0.2, 0.9],
  ['Edit', () => ({ file_path: `/regia/hooks/${pick(['svg.ts', 'radar.ts'])}` }), 0.2, 0.5],
  ['Bash', () => ({ command: pick(['node preview/build.mjs', 'claude plugin test regia', 'ls -la']) }), 0.8, 5],
  ['WebFetch', () => ({ url: 'https://developer.mozilla.org/svg' }), 1, 3],
  ['mcp__Claude_Browser__computer', () => ({ action: 'screenshot' }), 0.8, 2],
  ['Skill', () => ({ skill: 'animate' }), 0.3, 0.6],
]
const AGENTS = [
  ['Explore', 'Find where the iframe flicker starts'],
  ['design-reviewer', 'Critique the radar at 380 px'],
  ['general-purpose', 'Measure the real panel width'],
  ['seo-technical', 'Quick metadata check'],
]
const pick = list => list[Math.floor(Math.random() * list.length)]
const rand = (a, b) => a + Math.random() * (b - a)

/** Simula una sessione viva: chiama `apply(fn)` con riduttori a ritmo realistico. */
export const simulate = (M, apply, now = () => Date.now()) => {
  let n = 0
  let spawned = 0
  const toolCall = agentId => {
    const [tool, input, min, max] = pick(TOOLS)
    const id = `live${n++}`
    const err = Math.random() < 0.06
    const args = input()
    apply(s => M.callStarted(s, M.makeCall(id, tool, args, now(), agentId), M.filePathOf(args)))
    if (tool === 'Skill') apply(s => M.skillLoaded(s, 'animate', now()))
    setTimeout(() => apply(s => M.callEnded(s, id, now(), err)), rand(min, max) * 1000)
  }
  const mainLoop = () => {
    toolCall(undefined)
    setTimeout(mainLoop, rand(700, 2600))
  }
  const spawnLoop = () => {
    const [type, description] = AGENTS[spawned % AGENTS.length]
    const key = `ls${spawned}`
    const agentId = `la${spawned}`
    spawned += 1
    apply(s => M.agentSpawned(s, { key, type, description, isBackground: true, model: pick(['haiku', 'sonnet', 'opus']) }, now()))
    setTimeout(() => apply(s => M.agentStarted(s, key, agentId, undefined)), 300)
    const work = setInterval(() => toolCall(agentId), rand(900, 2200))
    setTimeout(() => {
      clearInterval(work)
      apply(s => M.agentFinished(s, agentId, now(), Math.random() < 0.15 ? 'failed' : 'completed', 4000))
    }, rand(14_000, 24_000))
    setTimeout(spawnLoop, rand(9000, 15_000))
  }
  const measureLoop = () => {
    apply(s => {
      const pct = Math.min(96, (s.meters.contextPercent ?? 40) + rand(1, 4))
      return M.metersMeasured(s, {
        context: { tokens: pct * 2000, window: 200_000, percent: pct },
        rateLimits: s.meters.rateLimits.map(r => ({ ...r, percentUsed: Math.min(99, r.percentUsed + rand(0.5, 2)) })),
        cost: { usd: (s.meters.costUsd ?? 0) + rand(0.05, 0.2) },
      }, now())
    })
    setTimeout(measureLoop, 12_000)
  }
  setTimeout(mainLoop, 400)
  setTimeout(spawnLoop, 2500)
  setTimeout(measureLoop, 6000)
}
