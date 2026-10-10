// Test della Regia con `claude plugin test`: gli hook di `on` qui sotto stanno sotto
// il plugin e fanno da engine (rispondono a tool.call, agent.spawn, turn.complete).

import { expect, mock, test } from 'claude-code/testing'

/** Il sorgente SVG di un monitor del pannello disegnato su desktop, trovato per `alt`. */
const ALT = {
  radar: 'Radar della regia',
  agents: 'Agenti al lavoro',
  skills: 'Skill caricate',
  tools: 'Strumenti più usati',
  files: 'File toccati',
} as const

type Engine = Parameters<Extract<Parameters<typeof test>[1], (...a: never[]) => unknown>>[0]

const monitor = async ($: Engine, which: keyof typeof ALT): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'regia', surface: 'desktop', ...pane(90) })
  const all = await ui.findAll({ type: 'Svg' })
  await ui.unmount()
  return String(all.find(one => one.props.alt === ALT[which])?.props.source ?? '')
}

const pane = (bodyColumns: number) =>
  ({
    component: 'Pane',
    requestId: 'regia',
    props: {
      title: 'Regia',
      isFocused: false,
      bodyColumns,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 60 },
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
  expect(tools).toContain('3 CHIAMATE')
  expect(tools).toContain('>Bash<')
  const files = await monitor($, 'files')
  expect(files).toContain('app.ts')
  expect(files).toContain('1 mod · 1 lett')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'regia', surface, ...pane(90) })
    expect(await ui.find({ key: 'reset' })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeDefined()
    await ui.unmount()
  }
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
  expect(agents).toContain('1 IN CORSO')
  expect(agents).toContain('Explore')
  // Stesso monogramma nel radar (satellite) e nella scheda.
  expect(agents).toContain('>EX<')
  expect(await monitor($, 'radar')).toContain('>EX<')

  await $.tool.call({ tool: 'Grep', pattern: 'Button', agentId: 'a1' } as never)
  agents = await monitor($, 'agents')
  expect(agents).toContain('1 strumento ')

  await $.turn.complete({
    answer: 'Fatto',
    durationMs: 4200,
    isAborted: false,
    turnId: 't1',
    agentId: 'a1',
    reason: 'answer',
  })
  agents = await monitor($, 'agents')
  expect(agents).toContain('FATTO')
  expect(agents).toContain('0 IN CORSO')
})

test('le skill si contano a ogni caricamento', async ($, on) => {
  mock.clock(on)
  on('skill.prompt', ($, e) => ({ text: e.text }))

  await $.skill.prompt({ skill: 'brand', text: '…' })
  await $.skill.prompt({ skill: 'dataviz', text: '…' })
  await $.skill.prompt({ skill: 'brand', text: '…' })

  const skills = await monitor($, 'skills')
  expect(skills).toContain('2 CARICATE · 3 USI')
  expect(skills).toContain('×2')
})
