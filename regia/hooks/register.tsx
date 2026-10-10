// Regia — cablaggio eventi → stato → pannello.
//
// Ascolta: tool.call (ogni strumento, anche dei subagenti), agent.spawn, turn.start,
// turn.complete (turni principali e fine dei subagenti), skill.prompt, session.measure,
// session.end (reset su /clear). Ogni evento passa da un riduttore puro di model.ts e
// scrive l'atom `regia.snap`. Il pannello `regia` lo legge e disegna:
//   - superfici con Svg (desktop, vscode, mobile) → i monitor di svg.ts
//   - terminale → una versione testuale compatta
// Un solo timer, avviato in session.start, fa avanzare `regia.now` ogni secondo
// solo mentre qualcosa lavora. Il motion (motion.ts) è agganciato all'orologio reale,
// quindi il ridisegno al secondo non fa ripartire né scattare le animazioni.
// Il radar (radar.ts) apre la parete; gli altri monitor vengono da svg.ts.
// Tutti i monitor sono immagini (Svg senza isInteractive): il desktop mette quelli
// interattivi in un iframe alto 150 px e rimpicciolisce l'SVG per farcelo stare.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { RegiaSnapshot, RegiaStatus } from '../types'
import { langOf, STRINGS } from './i18n'
import type { Strings } from './i18n'
import {
  agentDenied,
  agentFinished,
  agentSpawned,
  agentStarted,
  agentsReconciled,
  callEnded,
  callStarted,
  categorize,
  emptySnapshot,
  filePathOf,
  isBusy,
  latestStamp,
  makeCall,
  metersMeasured,
  runningAgents,
  skillLoaded,
  slicesMeasured,
  toolName,
  turnCompleted,
  turnStarted,
} from './model'
import { radarSvg } from './radar'
import {
  agentsSvg,
  C,
  filesSvg,
  fiveHourLimit,
  fmtClock,
  fmtTokens,
  metersSvg,
  skillsSvg,
  timelineSvg,
  toolsSvg,
} from './svg'

const PANE = 'regia'

/** Testi della lingua scelta (opzione `language` del manifest), fissati a ogni load. */
let L: Strings = STRINGS.en

const snap = atom({ plugin: 'regia', key: 'snap' } as const, emptySnapshot(0))
const clock = atom({ plugin: 'regia', key: 'now' } as const, 0)
const view = atom({ plugin: 'regia', key: 'view' } as const, { isCompact: false })

type $ = EngineInterface

const change = ($: $, fn: (s: RegiaSnapshot) => RegiaSnapshot): Promise<RegiaSnapshot> =>
  update($, snap, fn)

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

const STATUS_GLYPH: Record<RegiaStatus, { glyph: string; color: string }> = {
  pending: { glyph: '◌', color: C.wait },
  running: { glyph: '●', color: C.run },
  waiting: { glyph: '◌', color: C.wait },
  idle: { glyph: '◌', color: C.wait },
  completed: { glyph: '✓', color: C.good },
  failed: { glyph: '✕', color: C.bad },
  killed: { glyph: '✕', color: C.bad },
}

let ticks = 0
let lastStatus: string | undefined

/** Voce nella status line solo mentre lavorano dei subagenti. */
const refreshStatus = ($: $, s: RegiaSnapshot): void => {
  const live = runningAgents(s).length
  const text = live > 0 ? L.pane.status(live) : undefined
  if (text !== lastStatus) {
    lastStatus = text
    $.ui.status(text)
  }
}

const tick = async ($: $): Promise<void> => {
  const s = await read($, snap)
  if (!isBusy(s)) return
  ticks += 1
  const t = await $.clock.now()
  await update($, clock, () => t)
  if (ticks % 3 === 0 && runningAgents(s).length > 0) {
    const listed = await $.agent.list()
    const next = await change($, cur =>
      agentsReconciled(
        cur,
        listed.map(a => ({
          id: a.id,
          type: a.type,
          description: a.description,
          status: a.status,
          ...(a.parentId === undefined ? {} : { parentId: a.parentId }),
        })),
        t,
      ),
    )
    refreshStatus($, next)
  }
}

export const register: Register = (on, options) => {
  L = STRINGS[langOf(options.language)]
  // ── Sessione ───────────────────────────────────────────────────────────────

  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await change($, s => (s.startedAt > 0 ? s : { ...s, startedAt: usage.startedAt }))
    await change($, s =>
      metersMeasured(s, { context: usage.context, rateLimits: usage.rateLimits, ...(usage.cost ? { cost: usage.cost } : {}) }),
    )
    await $.command.register({
      name: 'regia',
      description: L.pane.command,
    })
    $.clock.every(1000, () => {
      void tick($)
    })
    void $.ui.open({ id: PANE, title: L.pane.title })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      const t = await $.clock.now()
      await change($, () => emptySnapshot(t))
      refreshStatus($, emptySnapshot(t))
    }
    return next(e)
  })

  on('command.run', { command: 'regia' }, async $ => {
    await $.ui.open({ id: PANE, title: L.pane.title })
    return { text: L.pane.opened }
  })

  // ── Turni ──────────────────────────────────────────────────────────────────

  on('turn.start', async ($, e, next) => {
    const t = await $.clock.now()
    await update($, clock, () => t)
    await change($, s => turnStarted(s, t, e.text))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const t = await $.clock.now()
    if (e.agentId === undefined) {
      await change($, s => turnCompleted(s, e.durationMs, e.usage))
    } else {
      const status: RegiaStatus = e.isAborted ? 'killed' : e.reason === 'error' ? 'failed' : 'completed'
      const s = await change($, cur => agentFinished(cur, e.agentId as string, t, status, e.usage?.output_tokens))
      refreshStatus($, s)
    }
    await update($, clock, () => t)
    return next(e)
  })

  // ── Strumenti ──────────────────────────────────────────────────────────────

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    const t0 = await $.clock.now()
    const id = e.tool_use_id ?? `${e.tool}-${t0}`
    const call = makeCall(id, e.tool, input, t0, e.agentId)
    await change($, s => callStarted(s, call, filePathOf(input)))

    const ran = await next(e)

    const t1 = await $.clock.now()
    const isError = ran.deny !== undefined || ran.isError === true
    await change($, s => callEnded(s, id, t1, isError))
    return ran
  })

  // ── Agenti ─────────────────────────────────────────────────────────────────

  on('agent.spawn', async ($, e, next) => {
    const t = await $.clock.now()
    await change($, s =>
      agentSpawned(
        s,
        {
          key: e.tool_use_id,
          type: e.subagentType || 'general-purpose',
          description: e.description,
          isBackground: e.background,
          ...(e.model === undefined ? {} : { model: e.model }),
          ...(e.parentAgentId === undefined ? {} : { parentAgentId: e.parentAgentId }),
        },
        t,
      ),
    )
    const result = await next(e)
    const s = await change($, cur =>
      result.deny !== undefined
        ? agentDenied(cur, e.tool_use_id, t)
        : agentStarted(cur, e.tool_use_id, result.agentId, result.model),
    )
    refreshStatus($, s)
    return result
  })

  // ── Skill ──────────────────────────────────────────────────────────────────

  on('skill.prompt', async ($, e, next) => {
    const t = await $.clock.now()
    await change($, s => skillLoaded(s, e.skill, t))
    return next(e)
  })

  // ── Misure: contesto, rate limit, costo ────────────────────────────────────

  on('session.measure', async ($, e, next) => {
    const at = await $.clock.now()
    await change($, s =>
      metersMeasured(s, { context: e.context, rateLimits: e.rateLimits, ...(e.cost ? { cost: e.cost } : {}) }, at),
    )
    const result = await next(e)
    if (e.changed.includes('context')) {
      const usage = await $.session.usage({ breakdown: 'summary' })
      const breakdown = usage.context.breakdown
      if (breakdown !== undefined) {
        await change($, s =>
          slicesMeasured(
            s,
            breakdown.categories.filter(c => !c.isDeferred),
            breakdown.model,
          ),
        )
      }
    }
    return result
  })

  // ── Pannello ───────────────────────────────────────────────────────────────

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, snap)
    const { isCompact } = await read($, view)
    // Disegno deterministico: l'ora è il battito del timer o l'ultimo evento, mai
    // l'orologio vivo. Un ridisegno senza cambi di stato (scroll, focus, una press)
    // produce così gli stessi SVG e il desktop non sostituisce le immagini: se le
    // sostituisse, l'altezza oscillerebbe e lo scroll entrerebbe in un circolo
    // (+1/-1 riga all'infinito, misurato con una sonda sul desktop).
    const beat = await read($, clock)
    const now = Math.max(beat, latestStamp(s))

    const toggle = () => update($, view, v => ({ ...v, isCompact: !v.isCompact }))
    const reset = async () => {
      const t = await $.clock.now()
      await change($, cur => ({ ...emptySnapshot(cur.startedAt || t), turn: cur.turn, meters: cur.meters }))
    }

    if (e.surface === 'terminal') {
      const { Box, Text, Button } = $.ui.resolve(e)
      const cols = e.props.bodyColumns
      const live = s.turn.isWorking
      const pct = s.meters.contextPercent
      const barW = clamp(cols - 34, 8, 30)
      const filled = pct === undefined ? 0 : Math.round((pct / 100) * barW)
      const agents = [...s.agents].reverse().slice(0, isCompact ? 3 : 8)
      const tools = Object.entries(s.toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
      const clockText = live && s.turn.startedAt !== undefined
        ? fmtClock(now - s.turn.startedAt)
        : s.turn.lastMs !== undefined ? fmtClock(s.turn.lastMs) : '—'

      return (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={2}>
            <Text color={live ? C.run : undefined} bold>{live ? L.terminal.live : L.terminal.idle}</Text>
            <Text dimColor>{L.terminal.turn(s.turn.count, clockText)}</Text>
            {s.meters.model === undefined ? null : <Text dimColor>{s.meters.model}</Text>}
          </Box>
          <Box flexDirection="row" gap={1}>
            <Text dimColor>{L.terminal.context}</Text>
            <Text>{'█'.repeat(filled)}</Text>
            <Text dimColor>{'░'.repeat(barW - filled)}</Text>
            <Text>{pct === undefined ? '—' : `${Math.round(pct)}%`}</Text>
            {fiveHourLimit(s) === undefined ? null : <Text dimColor>{L.terminal.five(Math.round(fiveHourLimit(s)?.percentUsed ?? 0))}</Text>}
            <Text dimColor>{L.terminal.out(fmtTokens(s.meters.outTokens, L))}</Text>
          </Box>
          <Text dimColor> </Text>
          <Text dimColor>{L.terminal.agents}</Text>
          {agents.length === 0 ? <Text dimColor>{L.terminal.noAgents}</Text> : null}
          {agents.map(a => (
            <Box key={a.key} flexDirection="row" gap={1}>
              <Text color={STATUS_GLYPH[a.status].color}>{STATUS_GLYPH[a.status].glyph}</Text>
              <Text bold>{a.type}</Text>
              <Text dimColor wrap="truncate-end">{a.description}</Text>
              <Text dimColor>{fmtClock((a.endedAt ?? now) - a.startedAt)} · {L.terminal.calls(a.tools)}</Text>
            </Box>
          ))}
          <Text dimColor> </Text>
          <Text dimColor>{L.terminal.skills}</Text>
          <Text wrap="wrap">
            {s.skills.length === 0
              ? L.terminal.none
              : s.skills.map(k => (k.count > 1 ? `${k.name} ×${k.count}` : k.name)).join('  ·  ')}
          </Text>
          {isCompact ? null : <Text dimColor> </Text>}
          {isCompact ? null : <Text dimColor>{L.terminal.tools}</Text>}
          {isCompact ? null : (
            <Text wrap="wrap">
              {tools.length === 0 ? L.terminal.none : tools.map(([t, n]) => `${toolName(t)} ${n}`).join('  ·  ')}
            </Text>
          )}
          <Box flexDirection="row" gap={1} marginTop={1}>
            <Button key="compact" label={isCompact ? L.pane.expand : L.pane.compact} onPress={toggle} />
            <Button key="reset" label={L.pane.resetShort} onPress={reset} />
          </Box>
        </Box>
      )
    }

    const { Box, Svg, Button } = $.ui.resolve(e)
    const w = clamp(Math.round(e.props.bodyColumns * 7.5), 300, 760)

    return (
      <Box flexDirection="column" gap={1}>
        <Svg key="radar" source={radarSvg(s, now, w, L)} alt={L.pane.alts.radar} />
        {isCompact ? null : (
          <Svg key="meters" source={metersSvg(s, now, w, L)} alt={L.pane.alts.meters} />
        )}
        <Svg key="agents" source={agentsSvg(s, now, w, isCompact, L)} alt={L.pane.alts.agents} />
        <Svg key="skills" source={skillsSvg(s, now, w, L)} alt={L.pane.alts.skills} />
        {isCompact ? null : <Svg key="timeline" source={timelineSvg(s, now, w, L)} alt={L.pane.alts.timeline} />}
        {isCompact ? null : (
          <Svg key="tools" source={toolsSvg(s, w, categorize, toolName, L)} alt={L.pane.alts.tools} />
        )}
        {isCompact ? null : <Svg key="files" source={filesSvg(s, now, w, L)} alt={L.pane.alts.files} />}
        <Box flexDirection="row" gap={1}>
          <Button key="compact" label={isCompact ? L.pane.expand : L.pane.compact} onPress={toggle} />
          <Button key="reset" label={L.pane.reset} onPress={reset} />
        </Box>
      </Box>
    )
  })
}
