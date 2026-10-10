// Contratto di $.state per il mod "regia".
// Tutto ciò che il pannello disegna vive qui, così sopravvive agli hot reload.
// I riduttori in hooks/model.ts sono gli unici a produrre questi valori.

/** Stato di un agente, come lo riporta $.agent.list() (AgentStatus). */
export type RegiaStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'idle'
  | 'completed'
  | 'failed'
  | 'killed'

/** Famiglia di uno strumento: guida colore e legenda. Ordine fisso = ordine palette. */
export type RegiaCategory =
  | 'read'
  | 'write'
  | 'shell'
  | 'web'
  | 'agent'
  | 'skill'
  | 'mcp'
  | 'other'

/** Un subagente nato in questa sessione. */
export type RegiaAgent = {
  /** tool_use_id dello spawn: chiave stabile anche prima che esista agentId. */
  key: string
  agentId?: string
  type: string
  description: string
  model?: string
  isBackground: boolean
  status: RegiaStatus
  startedAt: number
  endedAt?: number
  /** Strumenti chiamati dall'agente. */
  tools: number
  lastTool?: string
  parentAgentId?: string
  outTokens?: number
}

/** Una skill caricata (slash, Skill tool o preload). */
export type RegiaSkill = {
  name: string
  count: number
  firstAt: number
  lastAt: number
  /** Numero del turno principale in cui è stata caricata l'ultima volta. */
  turn: number
}

/** Una chiamata di strumento, principale o di un subagente. */
export type RegiaCall = {
  id: string
  tool: string
  category: RegiaCategory
  /** Dettaglio breve: nome file, comando, query, server MCP. */
  label: string
  agentId?: string
  startedAt: number
  endedAt?: number
  isError?: boolean
}

/** Un file toccato nella sessione. */
export type RegiaFile = {
  path: string
  edits: number
  reads: number
  lastAt: number
}

/** Una fetta della composizione del contesto (da $.session.usage breakdown). */
export type RegiaSlice = {
  name: string
  tokens: number
  kind: 'used' | 'free' | 'buffer'
}

export type RegiaRateLimit = {
  kind: string
  percentUsed: number
  resetsAt?: string
}

/** I valori della misura precedente: le barre animano dal vecchio al nuovo. */
export type RegiaPrevious = {
  contextPercent?: number
  /** percentUsed per kind del rate limit. */
  limits: Record<string, number>
}

export type RegiaMeters = {
  /** Istante dell'ultima misura (session.measure): aggancia l'animazione di crescita. */
  measuredAt?: number
  prev?: RegiaPrevious
  contextTokens?: number
  contextWindow?: number
  contextPercent?: number
  slices: RegiaSlice[]
  rateLimits: RegiaRateLimit[]
  costUsd?: number
  model?: string
  inTokens: number
  outTokens: number
  cacheReadTokens: number
}

export type RegiaTurn = {
  isWorking: boolean
  startedAt?: number
  count: number
  lastMs?: number
  prompt?: string
}

export type RegiaSnapshot = {
  startedAt: number
  turn: RegiaTurn
  meters: RegiaMeters
  agents: RegiaAgent[]
  skills: RegiaSkill[]
  /** Ultime chiamate, più vecchie per prime; tagliate a CALL_LIMIT. */
  calls: RegiaCall[]
  /** Conteggio cumulativo per nome strumento (non tagliato). */
  toolCounts: Record<string, number>
  errorCount: number
  files: RegiaFile[]
}

export type RegiaView = {
  isCompact: boolean
}

declare module 'claude-code' {
  interface PluginState {
    regia: {
      snap: RegiaSnapshot
      /** Orologio del pannello: avanza solo mentre qualcosa lavora. */
      now: number
      view: RegiaView
    }
  }
}
