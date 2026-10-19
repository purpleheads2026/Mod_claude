// Test della Regia con `claude plugin test`: gli hook di `on` qui sotto stanno sotto
// il plugin e fanno da engine (rispondono a tool.call, agent.spawn, turn.complete).

import { expect, mock, test } from 'claude-code/testing'

/** Il sorgente SVG di un monitor del pannello disegnato su desktop, trovato per `alt`. */
const ALT = {
  radar: 'Regia radar',
  agents: 'Agents at work',
  skills: 'Loaded skills',
  tools: 'Most used tools',
  files: 'Files touched',
} as const

type Engine = Parameters<Extract<Parameters<typeof test>[1], (...a: never[]) => unknown>>[0]

const monitor = async ($: Engine, which: keyof typeof ALT): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'regia', surface: 'desktop', ...pane(90) })
  const all = await ui.findAll({ type: 'Svg' })
  await ui.unmount()
  return String(all.find(one => one.props.alt === ALT[which])?.props.source ?? '')
}

const pane = (bodyColumns: number, placement: 'dock' | 'inline' = 'dock', bodyRows = 60) =>
  ({
    component: 'Pane',
    requestId: 'regia',
    props: {
      title: 'Regia',
      isFocused: false,
      bodyColumns,
      placement,
      scroll: { offset: 0, bodyRows },
      view: {},
    },
  }) as const

test('ogni strumento finisce nello snapshot e nel pannello', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: 'ok' as never }))

  await $.tool.call({ tool: 'Read', file_path: '/repo/src/app.ts' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/app.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  const tools = await monitor($, 'tools')
  expect(tools).toContain('3 CALLS')
  expect(tools).toContain('>Bash<')
  const files = await monitor($, 'files')
  expect(files).toContain('app.ts')
  expect(files).toContain('1 edit · 1 read')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'regia', surface, ...pane(90) })
    expect(await ui.find({ key: 'reset' })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeDefined()
    await ui.unmount()
  }
})

test('su VS Code il pannello disegna gli stessi monitor e bottoni del desktop', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: 'ok' as never }))
  await $.tool.call({ tool: 'Read', file_path: '/repo/src/app.ts' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  const monitors = async (surface: 'desktop' | 'vscode', p: ReturnType<typeof pane>) => {
    const ui = await $.ui.mount({ plugin: 'regia', surface, ...p })
    const alts = (await ui.findAll({ type: 'Svg' })).map(one => String(one.props.alt))
    const buttons = [await ui.find({ key: 'reset' }), await ui.find({ key: 'compact' })]
    await ui.unmount()
    return { alts, buttons }
  }

  // Pannello laterale come sul desktop, e il pannello in basso di VS Code: largo e basso.
  for (const p of [pane(90), pane(200, 'inline', 18)]) {
    const desktop = await monitors('desktop', p)
    const vscode = await monitors('vscode', p)
    expect(vscode.alts.length).toBeGreaterThan(0)
    expect(vscode.alts).toEqual(desktop.alts)
    expect(vscode.alts).toContain(ALT.radar)
    for (const button of vscode.buttons) expect(button).toBeDefined()
  }
})

test('su un pannello stretto la strumentazione non tronca etichette e dettagli', { options: { language: 'it' } }, async ($, on) => {
  mock.clock(on)
  // 40 colonne = 300 px, il minimo (il pannello di VS Code); 90 colonne = 675 px, il desktop.
  for (const columns of [40, 90]) {
    const ui = await $.ui.mount({ plugin: 'regia', surface: 'vscode', ...pane(columns) })
    const all = await ui.findAll({ type: 'Svg' })
    await ui.unmount()
    const meters = String(all.find(one => String(one.props.alt).startsWith('Contesto'))?.props.source ?? '')
    for (const text of ['LIMITE 5 ORE', 'TOKEN USCITA', 'da misurare', 'nessun limite']) {
      expect(meters).toContain(`>${text}<`)
    }
    expect(meters).not.toContain('…')
  }
})

test('/regia dice se il pannello è sullo schermo o perché non lo è', async ($, on) => {
  const origin = { kind: 'composer' } as const
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no attached surface draws panes' } }))
  const hidden = await $.command.run({ command: 'regia', args: '', origin })
  expect(String(hidden.text)).toContain('not on screen yet: no attached surface draws panes')
})

test('/regia conferma quando il pannello compare', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const shown = await $.command.run({ command: 'regia', args: '', origin: { kind: 'composer' } })
  expect(String(shown.text)).toBe('Regia opened.')
})

test('un subagente nasce, lavora e finisce', async ($, on) => {
  mock.clock(on)
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'a1' }))
  on('tool.call', () => ({ result: 'ok' as never }))
  on('turn.complete', ($, e) => ({ text: e.answer }))

  await $.agent.spawn({
    tool_use_id: 'tu1',
    prompt: 'Trova i componenti',
    description: 'Trova i componenti',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
  })
  let agents = await monitor($, 'agents')
  expect(agents).toContain('1 RUNNING')
  expect(agents).toContain('Explore')
  // Stesso monogramma nel radar (satellite) e nella scheda.
  expect(agents).toContain('>EX<')
  expect(await monitor($, 'radar')).toContain('>EX<')

  await $.tool.call({ tool: 'Grep', pattern: 'Button', agentId: 'a1' } as never)
  agents = await monitor($, 'agents')
  expect(agents).toContain('1 tool call ')

  await $.turn.complete({
    answer: 'Fatto',
    durationMs: 4200,
    isAborted: false,
    turnId: 't1',
    agentId: 'a1',
    reason: 'answer',
  })
  agents = await monitor($, 'agents')
  expect(agents).toContain('DONE')
  expect(agents).toContain('0 RUNNING')
})

test('le skill si contano a ogni caricamento', async ($, on) => {
  const clock = mock.clock(on)
  on('skill.prompt', ($, e) => ({ text: e.text }))

  await $.skill.prompt({ skill: 'brand', text: '…' })
  await clock.advance(5000)
  await $.skill.prompt({ skill: 'dataviz', text: '…' })
  await clock.advance(5000)
  await $.skill.prompt({ skill: 'brand', text: '…' })

  const skills = await monitor($, 'skills')
  expect(skills).toContain('2 LOADED · 3 USES')
  expect(skills).toContain('×2')
})

test('con language: it il pannello parla italiano', { options: { language: 'it' } }, async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: 'ok' as never }))
  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  const ui = await $.ui.mount({ plugin: 'regia', surface: 'desktop', ...pane(90) })
  const all = await ui.findAll({ type: 'Svg' })
  const radar = String(all.find(one => one.props.alt === 'Radar della regia')?.props.source ?? '')
  expect(radar).toContain('IN ATTESA')
  expect(radar).toContain('1 strumento')
  expect((await ui.find({ key: 'reset' }))?.props.label).toBe('Azzera statistiche')
  await ui.unmount()
})

/** La riga che ogni skill aggiunge alla conversazione quando si carica. */
const skillRow = (dir: string) =>
  ({
    message: { type: 'user', isMeta: true, content: [{ type: 'text', text: `Base directory for this skill: ${dir}\n\n# Skill` }] },
    door: 'command',
    origin: { kind: 'engine' },
    uuid: `row-${dir}`,
  }) as never

test('una skill avviata da comando slash compare tra le skill', async ($, on) => {
  mock.clock(on)
  await $.session.append(skillRow('/Users/x/.claude/skills/instagram-marketing'))

  const skills = await monitor($, 'skills')
  expect(skills).toContain('>instagram-marketing<')
  expect(skills).toContain('1 LOADED · 1 USE')
})

test('strumento Skill e riga della skill contano un caricamento solo', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: 'ok' as never }))
  await $.tool.call({ tool: 'Skill', skill: 'anthropic-skills:docx' } as never)
  await $.session.append(skillRow('/plugins/anthropic-skills/skills/docx'))

  const skills = await monitor($, 'skills')
  expect(skills).toContain('>docx<')
  expect(skills).toContain('1 LOADED · 1 USE')
})
