// Riduttori puri dello stato della Regia.
// Ogni funzione prende lo snapshot e restituisce il nuovo snapshot: niente `$`,
// niente orologio, niente I/O. register.tsx li chiama dentro `update($, snap, fn)`;
// i test e preview/build.mjs li usano così come sono.
// Solo import di tipi: il file deve restare eseguibile anche da Node (type stripping).

             
             
            
                
            
                 
             
                
              
                 

export const CALL_LIMIT = 160
export const AGENT_LIMIT = 40
export const FILE_LIMIT = 40

export const emptySnapshot = (at        )                => ({
  startedAt: at,
  turn: { isWorking: false, count: 0 },
  meters: {
    slices: [],
    rateLimits: [],
    inTokens: 0,
    outTokens: 0,
    cacheReadTokens: 0,
  },
  agents: [],
  skills: [],
  calls: [],
  toolCounts: {},
  errorCount: 0,
  files: [],
})

// ── Strumenti ────────────────────────────────────────────────────────────────

const READ = new Set([
  'Read', 'Grep', 'Glob', 'LSP', 'ToolSearch', 'ListMcpResourcesTool',
  'ReadMcpResourceTool', 'ReadMcpResourceDirTool', 'ListSkills', 'SearchSkills',
  'ListAgents', 'TaskGet', 'TaskList', 'memory_read', 'memory_list', 'ListPlugins',
])
const WRITE = new Set(['Edit', 'Write', 'NotebookEdit', 'memory_write'])
const SHELL = new Set(['Bash', 'PowerShell', 'Monitor', 'TaskStop'])
const WEB = new Set(['WebFetch', 'WebSearch'])
const AGENT = new Set(['Agent', 'Task', 'SendMessage', 'Workflow'])

export const categorize = (tool        )                => {
  if (READ.has(tool)) return 'read'
  if (WRITE.has(tool)) return 'write'
  if (SHELL.has(tool)) return 'shell'
  if (WEB.has(tool) || /^mcp__(Claude_Browser|claude-in-chrome)__/.test(tool)) return 'web'
  if (AGENT.has(tool)) return 'agent'
  if (tool === 'Skill') return 'skill'
  if (tool.startsWith('mcp__')) return 'mcp'
  return 'other'
}

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i

/** `mcp__Claude_Browser__computer` → `Browser·computer`; i built-in restano uguali. */
export const toolName = (tool        )         => {
  if (!tool.startsWith('mcp__')) return tool
  const [server = '', ...rest] = tool.slice(5).split('__')
  const short = UUIDISH.test(server) ? server.slice(0, 4) : server.replace(/^Claude_/, '')
  return `${short}·${rest.join('_')}`
}

const tail = (path        , parts = 2)         =>
  path.split('/').filter(Boolean).slice(-parts).join('/')

const oneLine = (text        , max        )         => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

const str = (input                         , key        )                     => {
  const value = input[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Il dettaglio più parlante dell'input di uno strumento, in una riga breve. */
export const labelOf = (tool        , input                         )         => {
  const file = str(input, 'file_path') ?? str(input, 'notebook_path') ?? str(input, 'path')
  if (file !== undefined) return tail(file)
  const pick =
    str(input, 'skill') ??
    str(input, 'description') ??
    str(input, 'command') ??
    str(input, 'pattern') ??
    str(input, 'query') ??
    str(input, 'url') ??
    str(input, 'prompt') ??
    str(input, 'subject')
  if (pick !== undefined) return oneLine(pick.replace(/^https?:\/\//, ''), 64)
  return tool.startsWith('mcp__') ? toolName(tool) : ''
}

export const makeCall = (
  id        ,
  tool        ,
  input                         ,
  at        ,
  agentId         ,
)            => ({
  id,
  tool,
  category: categorize(tool),
  label: labelOf(tool, input),
  ...(agentId === undefined ? {} : { agentId }),
  startedAt: at,
})

const touchFile = (
  files             ,
  path        ,
  kind                 ,
  at        ,
)              => {
  const found = files.find(f => f.path === path)
  const next            = found
    ? { ...found, lastAt: at }
    : { path, edits: 0, reads: 0, lastAt: at }
  if (kind === 'edit') next.edits += 1
  else next.reads += 1
  return [next, ...files.filter(f => f.path !== path)].slice(0, FILE_LIMIT)
}

export const callStarted = (
  s               ,
  call           ,
  filePath         ,
)                => {
  const calls = [...s.calls.filter(c => c.id !== call.id), call].slice(-CALL_LIMIT)
  const toolCounts = { ...s.toolCounts, [call.tool]: (s.toolCounts[call.tool] ?? 0) + 1 }
  const agents =
    call.agentId === undefined
      ? s.agents
      : s.agents.map(a =>
          a.agentId === call.agentId
            ? { ...a, tools: a.tools + 1, lastTool: toolName(call.tool) }
            : a,
        )
  const files =
    filePath === undefined
      ? s.files
      : touchFile(s.files, filePath, call.category === 'write' ? 'edit' : 'read', call.startedAt)
  return { ...s, calls, toolCounts, agents, files }
}

export const callEnded = (
  s               ,
  id        ,
  at        ,
  isError         ,
)                => ({
  ...s,
  calls: s.calls.map(c =>
    c.id === id ? { ...c, endedAt: at, ...(isError ? { isError: true } : {}) } : c,
  ),
  errorCount: s.errorCount + (isError ? 1 : 0),
})

// ── Agenti ───────────────────────────────────────────────────────────────────

const TERMINAL                           = new Set(['completed', 'failed', 'killed'])

export const isTerminal = (status             )          => TERMINAL.has(status)

export const agentSpawned = (
  s               ,
  agent                                                                     
                                                        ,
  at        ,
)                => ({
  ...s,
  agents: [
    ...s.agents.filter(a => a.key !== agent.key),
    { ...agent, status: 'pending'         , startedAt: at, tools: 0 },
  ].slice(-AGENT_LIMIT),
})

export const agentStarted = (
  s               ,
  key        ,
  agentId                    ,
  model                    ,
)                => ({
  ...s,
  agents: s.agents.map(a =>
    a.key === key
      ? {
          ...a,
          status: 'running'         ,
          ...(agentId === undefined ? {} : { agentId }),
          ...(model === undefined ? {} : { model }),
        }
      : a,
  ),
})

export const agentDenied = (s               , key        , at        )                => ({
  ...s,
  agents: s.agents.map(a =>
    a.key === key ? { ...a, status: 'failed'         , endedAt: at } : a,
  ),
})

export const agentFinished = (
  s               ,
  agentId        ,
  at        ,
  status             ,
  outTokens         ,
)                => ({
  ...s,
  agents: s.agents.map(a =>
    a.agentId === agentId
      ? {
          ...a,
          status,
          endedAt: a.endedAt ?? at,
          ...(outTokens === undefined ? {} : { outTokens }),
        }
      : a,
  ),
})

                           
            
              
                     
                     
                   
 

/** Allinea gli stati a $.agent.list(): aggiunge chi è nato senza agent.spawn. */
export const agentsReconciled = (
  s               ,
  listed                        ,
  at        ,
)                => {
  let agents = s.agents
  for (const one of listed) {
    const found = agents.find(a => a.agentId === one.id || a.key === one.id)
    if (found === undefined) {
      agents = [
        ...agents,
        {
          key: one.id,
          agentId: one.id,
          type: one.type,
          description: one.description,
          isBackground: true,
          status: one.status,
          startedAt: at,
          tools: 0,
          ...(one.parentId === undefined ? {} : { parentAgentId: one.parentId }),
          ...(isTerminal(one.status) ? { endedAt: at } : {}),
        },
      ].slice(-AGENT_LIMIT)
    } else if (found.status !== one.status && !isTerminal(found.status)) {
      agents = agents.map(a =>
        a === found
          ? { ...a, status: one.status, ...(isTerminal(one.status) ? { endedAt: at } : {}) }
          : a,
      )
    }
  }
  return agents === s.agents ? s : { ...s, agents }
}

// ── Turni, skill, misure ─────────────────────────────────────────────────────

/** Notifiche che arrivano come turno ma non le ha scritte la persona (chiavi di i18n.notices). */
const NOTICES = new Set(['agent-message', 'task-notification', 'system-reminder', 'local-command-stdout'])

/**
 * Il prompt come riga leggibile: il testo della persona così com'è; una notifica
 * interna (`<agent-message …>`, `<task-notification>`) come chiave preceduta da ↳
 * (`↳agent-message`), tradotta al disegno; un comando come `↳/nome`.
 */
export const promptLabel = (text        )         => {
  const trimmed = text.trim()
  const tag = /^<([a-z][\w-]*)/i.exec(trimmed)?.[1]
  if (tag === undefined) return oneLine(trimmed, 120)
  if (tag === 'command-name') {
    const name = /<command-name>([^<]*)</.exec(trimmed)?.[1]?.trim()
    return `↳${name === undefined || name === '' ? 'notice' : name}`
  }
  if (NOTICES.has(tag)) return `↳${tag}`
  const plain = oneLine(trimmed.replace(/<[^>]+>/g, ' '), 120)
  return plain === '' ? '↳notice' : plain
}

export const turnStarted = (s               , at        , prompt        )                =>
  s.turn.isWorking
    ? s
    : {
        ...s,
        turn: {
          ...s.turn,
          isWorking: true,
          startedAt: at,
          count: s.turn.count + 1,
          prompt: promptLabel(prompt),
        },
      }

                         
                
                       
                        
                                  
 

export const turnCompleted = (
  s               ,
  durationMs        ,
  usage            ,
)                => ({
  ...s,
  turn: { ...s.turn, isWorking: false, lastMs: durationMs },
  meters: {
    ...s.meters,
    ...(usage?.model === undefined ? {} : { model: usage.model }),
    inTokens: s.meters.inTokens + (usage?.input_tokens ?? 0),
    outTokens: s.meters.outTokens + (usage?.output_tokens ?? 0),
    cacheReadTokens: s.meters.cacheReadTokens + (usage?.cache_read_input_tokens ?? 0),
  },
})

/**
 * Una skill caricata. La stessa skill arriva da più segnali (la riga della skill nella
 * conversazione, lo strumento Skill, l'evento skill.prompt quando l'engine lo solleva):
 * entro SKILL_DEDUPE_MS dall'ultima volta è lo stesso caricamento e non si conta.
 */
export const SKILL_DEDUPE_MS = 3000

/** "plugin:nome" (strumento Skill, skill.prompt) e "nome" (cartella della skill) sono la stessa. */
const skillKey = (raw        )         => raw.slice(raw.lastIndexOf(':') + 1).trim()

export const skillLoaded = (s               , raw        , at        )                => {
  const name = skillKey(raw)
  if (name === '') return s
  const found = s.skills.find(k => k.name === name)
  if (found !== undefined && Math.abs(at - found.lastAt) < SKILL_DEDUPE_MS) return s
  const next = found
    ? { ...found, count: found.count + 1, lastAt: at, turn: s.turn.count }
    : { name, count: 1, firstAt: at, lastAt: at, turn: s.turn.count }
  return { ...s, skills: [next, ...s.skills.filter(k => k.name !== name)] }
}

const SKILL_ROW = /Base directory for this skill:\s*([^\n]+)/

/**
 * Il nome della skill da una riga della conversazione: ogni skill caricata (comando
 * slash, strumento Skill, preload) entra con "Base directory for this skill: <cartella>",
 * e il nome è l'ultima parte della cartella.
 */
export const skillFromText = (text        )                     => {
  const dir = SKILL_ROW.exec(text)?.[1]?.trim().replace(/\/+$/, '')
  const name = dir?.split('/').pop()
  return name === undefined || name === '' ? undefined : name
}

/**
 * Le skill già presenti nella conversazione quando il plugin si carica (dopo un
 * /reload-plugins o all'apertura di una sessione ripresa). Aggiunge solo quelle che lo
 * snapshot non ha, con turn -1: sono storia, non "attive in questo turno".
 */
export const skillsBackfilled = (s               , names                   , at        )                => {
  const counts = new Map                ()
  for (const name of names.map(skillKey).filter(n => n !== '')) counts.set(name, (counts.get(name) ?? 0) + 1)
  const missing = [...counts.entries()].filter(([name]) => !s.skills.some(k => k.name === name))
  if (missing.length === 0) return s
  const added = missing.reverse().map(([name, count]) => ({ name, count, firstAt: at, lastAt: at, turn: -1 }))
  return { ...s, skills: [...s.skills, ...added] }
}

                           
                                                                
                                       
                        
 

export const metersMeasured = (s               , m             , at         )                => ({
  ...s,
  meters: {
    ...s.meters,
    ...(at === undefined ? {} : { measuredAt: at }),
    prev: {
      ...(s.meters.contextPercent === undefined ? {} : { contextPercent: s.meters.contextPercent }),
      limits: Object.fromEntries(s.meters.rateLimits.map(r => [r.kind, r.percentUsed])),
    },
    contextWindow: m.context.window,
    ...(m.context.tokens === undefined ? {} : { contextTokens: m.context.tokens }),
    ...(m.context.percent === undefined ? {} : { contextPercent: m.context.percent }),
    rateLimits: m.rateLimits.map(r => ({
      kind: r.kind,
      percentUsed: r.percentUsed,
      ...(r.resetsAt === undefined ? {} : { resetsAt: r.resetsAt }),
    })),
    ...(m.cost === undefined ? {} : { costUsd: m.cost.usd }),
  },
})

                                                                         

/** Le categorie di /context ridotte a fette: le 6 più grandi, il resto in "Altro". */
export const slicesMeasured = (
  s               ,
  categories                         ,
  model         ,
)                => {
  const used = categories
    .filter(c => c.kind === 'used' && c.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
  const head = used.slice(0, 6)
  const rest = used.slice(6).reduce((sum, c) => sum + c.tokens, 0)
  const slices               = [
    ...head.map(c => ({ name: c.name, tokens: c.tokens, kind: 'used'          })),
    ...(rest > 0 ? [{ name: 'Altro', tokens: rest, kind: 'used'          }] : []),
    ...categories
      .filter(c => (c.kind === 'free' || c.kind === 'buffer') && c.tokens > 0)
      .map(c => ({ name: c.name, tokens: c.tokens, kind: c.kind                      })),
  ]
  return {
    ...s,
    meters: { ...s.meters, slices, ...(model === undefined ? {} : { model }) },
  }
}

// ── Letture derivate ─────────────────────────────────────────────────────────

export const runningAgents = (s               )               =>
  s.agents.filter(a => !isTerminal(a.status))

export const isBusy = (s               )          =>
  s.turn.isWorking ||
  runningAgents(s).length > 0 ||
  s.calls.some(c => c.endedAt === undefined)

/**
 * L'istante più recente registrato nello snapshot: con il battito del timer è l'"ora"
 * del disegno. Funzione dello stato, quindi due disegni dello stesso stato coincidono.
 */
export const latestStamp = (s               )         =>
  Math.max(
    s.startedAt,
    s.turn.startedAt ?? 0,
    s.meters.measuredAt ?? 0,
    ...s.calls.map(c => c.endedAt ?? c.startedAt),
    ...s.agents.map(a => a.endedAt ?? a.startedAt),
    ...s.skills.map(k => k.lastAt),
    ...s.files.map(f => f.lastAt),
  )

export const filePathOf = (input                         )                     =>
  str(input, 'file_path') ?? str(input, 'notebook_path')
