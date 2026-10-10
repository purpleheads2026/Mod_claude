// Testi della Regia in inglese (default) e italiano. Ogni scritta visibile del pannello
// passa da qui: i monitor (svg.ts, radar.ts) e register.tsx ricevono un `Strings` e non
// contengono testo proprio. La lingua viene dall'opzione `language` del manifest
// (userConfig), letta in register.tsx.
// Solo tipi importati: il file resta eseguibile da Node per l'anteprima.

                                                          

                              

                                                                      

                       
                 
                                                                     
                                         
                                     
                                  
                                         
                              
                              
                               
                                    
                                         
                                                                                         
                                 
          
                               
                                 
               
                
                
                                    
                                         
                 
                                     
                                          
                                                                                                
   
           
                 
                   
                       
                    
                   
                      
                     
                                
                     
                                 
                  
                                              
                   
   
           
                 
                                                   
                
                 
                      
                                  
                                                
                    
   
           
                 
                                               
                 
                                 
                    
                                             
                    
   
             
                 
                                  
                 
               
                
                   
                 
                                                 
                    
   
               
                 
                                                     
                 
                                                  
                                 
                    
   
          
                 
                                                     
                 
                                
                                
                              
                    
   
         
                 
                   
                  
                                 
                   
                  
                 
                      
                                                                                                                           
   
             
                
                
                                              
                   
                              
                                 
                  
                    
                                
                  
                
                 
   
 

const plural = (n        , one        , many        )         => `${n} ${n === 1 ? one : many}`

const en          = {
  decimal: '.',
  units: { ms: 'ms', s: 's', min: 'min', h: 'h', d: 'd' },
  category: {
    read: 'Read', write: 'Write', shell: 'Shell', web: 'Web',
    agent: 'Agents', skill: 'Skills', mcp: 'MCP', other: 'Other',
  },
  status: {
    pending: 'STARTING', running: 'RUNNING', waiting: 'WAITING', idle: 'IDLE',
    completed: 'DONE', failed: 'FAILED', killed: 'STOPPED',
  },
  limit: { five: '5 hours', seven: '7 days', sevenOpus: '7 days · Opus', sevenSonnet: '7 days · Sonnet' },
  tools: n => plural(n, 'tool call', 'tool calls'),
  calls: n => plural(n, 'call', 'calls'),
  errors: n => plural(n, 'error', 'errors'),
  resetsIn: span => `resets in ${span}`,
  resetsInShort: span => `resets in ${span}`,
  notices: {
    'agent-message': 'message from a subagent',
    'task-notification': 'background task notification',
    'system-reminder': 'system reminder',
    'local-command-stdout': 'command output',
    notice: 'notification',
  },
  radar: {
    turn: n => `TURN ${n}`,
    five: pct => `5H ${pct}%`,
    now: 'NOW',
    live: 'ON AIR',
    idle: 'STANDBY',
    context: pct => `context ${pct}`,
    contextShort: pct => `ctx ${pct}`,
    empty: 'Send a prompt to go on air.',
    session: span => `session ${span}`,
    sessionShort: span => `sess. ${span}`,
    alt: (state, turn, clock, running, recent) =>
      `Regia: ${state}, turn ${turn}, ${clock}; ${running} agents running; ${recent} calls in the last minute`,
  },
  meters: {
    title: 'INSTRUMENTS',
    context: 'CONTEXT',
    notMeasured: 'not measured yet',
    fiveHour: '5-HOUR LIMIT',
    noLimit: 'no limit',
    windowOpen: 'window open',
    outTokens: 'OUTPUT TOKENS',
    cache: v => `cache ${v}`,
    breakdown: 'CONTEXT BREAKDOWN',
    tokens: v => `${v} tokens`,
    limits: 'USAGE LIMITS',
    alt: (ctx, five) => `Context ${ctx}, 5-hour limit ${five}`,
    unknown: 'not available',
  },
  agents: {
    title: 'AGENTS',
    counts: (live, total) => `${live} RUNNING · ${total} TOTAL`,
    main: 'main session',
    empty: 'No subagents at work yet.',
    background: 'background',
    earlier: n => `+ ${n} earlier ${n === 1 ? 'agent' : 'agents'}`,
    alt: (live, total) => `${live} of ${total} agents running`,
    altEmpty: 'No subagents',
  },
  skills: {
    title: 'SKILLS',
    counts: (n, uses) => `${n} LOADED · ${uses} ${uses === 1 ? 'USE' : 'USES'}`,
    empty: 'No skills loaded in this session.',
    loaded: n => `loaded ${n === 1 ? 'once' : `${n} times`}`,
    thisTurn: 'this turn',
    alt: (n, names) => `${n} skills loaded: ${names}`,
    altEmpty: 'No skills',
  },
  timeline: {
    title: 'ACTIVITY',
    last: span => `LAST ${span}`,
    empty: 'No activity in the last few minutes.',
    now: 'now',
    main: 'main',
    running: 'running',
    error: 'error',
    alt: (calls, lanes) => `Activity: ${calls} calls in ${lanes} lanes`,
    altEmpty: 'No recent activity',
  },
  toolsBoard: {
    title: 'TOOLS',
    counts: (calls, errors) => `${calls} CALLS${errors > 0 ? ` · ${errors} ${errors === 1 ? 'ERROR' : 'ERRORS'}` : ''}`,
    empty: 'No calls yet.',
    more: (tools, calls) => `+ ${tools} more ${tools === 1 ? 'tool' : 'tools'} · ${plural(calls, 'call', 'calls')}`,
    alt: list => `Most used tools: ${list}`,
    altEmpty: 'No tools used',
  },
  files: {
    title: 'FILES TOUCHED',
    counts: (edited, total) => `${edited} EDITED · ${total} TOTAL`,
    empty: 'No files read or edited.',
    edits: n => plural(n, 'edit', 'edits'),
    reads: n => plural(n, 'read', 'reads'),
    alt: n => `${n} files touched`,
    altEmpty: 'No files',
  },
  pane: {
    title: 'Regia',
    command: 'Open Regia: agents, skills, tools and context in real time',
    opened: 'Regia opened.',
    status: n => `Regia · ${plural(n, 'agent', 'agents')} running`,
    compact: 'Compact',
    expand: 'Expand',
    reset: 'Reset stats',
    resetShort: 'Reset',
    alts: {
      radar: 'Regia radar', meters: 'Context and limits', agents: 'Agents at work',
      skills: 'Loaded skills', timeline: 'Activity over time', tools: 'Most used tools', files: 'Files touched',
    },
  },
  terminal: {
    live: '● ON AIR',
    idle: '○ STANDBY',
    turn: (n, clock) => `turn ${n} · ${clock}`,
    context: 'context',
    out: v => `· out ${v}`,
    five: pct => `· 5h ${pct}%`,
    agents: 'AGENTS',
    noAgents: 'no subagents',
    calls: n => `${n} calls`,
    skills: 'SKILLS',
    none: 'none',
    tools: 'TOOLS',
  },
}

const it          = {
  decimal: ',',
  units: { ms: 'ms', s: 's', min: 'min', h: 'h', d: 'g' },
  category: {
    read: 'Lettura', write: 'Scrittura', shell: 'Shell', web: 'Web',
    agent: 'Agenti', skill: 'Skill', mcp: 'MCP', other: 'Altro',
  },
  status: {
    pending: 'IN PARTENZA', running: 'IN CORSO', waiting: 'IN ATTESA', idle: 'FERMO',
    completed: 'FATTO', failed: 'ERRORE', killed: 'FERMATO',
  },
  limit: { five: '5 ore', seven: '7 giorni', sevenOpus: '7 giorni · Opus', sevenSonnet: '7 giorni · Sonnet' },
  tools: n => plural(n, 'strumento', 'strumenti'),
  calls: n => plural(n, 'chiamata', 'chiamate'),
  errors: n => plural(n, 'errore', 'errori'),
  resetsIn: span => `si azzera tra ${span}`,
  resetsInShort: span => `azzera tra ${span}`,
  notices: {
    'agent-message': 'messaggio da un subagente',
    'task-notification': 'notifica di un task in background',
    'system-reminder': 'promemoria di sistema',
    'local-command-stdout': 'uscita di un comando',
    notice: 'notifica',
  },
  radar: {
    turn: n => `TURNO ${n}`,
    five: pct => `5 ORE ${pct}%`,
    now: 'ORA',
    live: 'IN ONDA',
    idle: 'IN ATTESA',
    context: pct => `contesto ${pct}`,
    contextShort: pct => `ctx ${pct}`,
    empty: 'Scrivi un prompt: la regia si accende.',
    session: span => `sessione ${span}`,
    sessionShort: span => `sess. ${span}`,
    alt: (state, turn, clock, running, recent) =>
      `Regia: ${state}, turno ${turn}, ${clock}; ${running} agenti in corso; ${recent} chiamate nell'ultimo minuto`,
  },
  meters: {
    title: 'STRUMENTAZIONE',
    context: 'CONTESTO',
    notMeasured: 'da misurare',
    fiveHour: 'LIMITE 5 ORE',
    noLimit: 'nessun limite',
    windowOpen: 'finestra in corso',
    outTokens: 'TOKEN USCITA',
    cache: v => `cache ${v}`,
    breakdown: 'COMPOSIZIONE DEL CONTESTO',
    tokens: v => `${v} token`,
    limits: 'LIMITI DI UTILIZZO',
    alt: (ctx, five) => `Contesto ${ctx}, limite 5 ore ${five}`,
    unknown: 'non disponibile',
  },
  agents: {
    title: 'AGENTI',
    counts: (live, total) => `${live} IN CORSO · ${total} TOTALI`,
    main: 'sessione principale',
    empty: 'Ancora nessun subagente al lavoro.',
    background: 'in background',
    earlier: n => `+ ${n} ${n === 1 ? 'operatore precedente' : 'operatori precedenti'}`,
    alt: (live, total) => `${live} agenti in corso su ${total}`,
    altEmpty: 'Nessun subagente',
  },
  skills: {
    title: 'SKILL',
    counts: (n, uses) => `${n} CARICATE · ${uses} ${uses === 1 ? 'USO' : 'USI'}`,
    empty: 'Nessuna skill caricata in questa sessione.',
    loaded: n => `caricata ${n} ${n === 1 ? 'volta' : 'volte'}`,
    thisTurn: 'in questo turno',
    alt: (n, names) => `${n} skill caricate: ${names}`,
    altEmpty: 'Nessuna skill',
  },
  timeline: {
    title: 'ATTIVITÀ',
    last: span => `ULTIMI ${span}`,
    empty: 'Nessuna attività negli ultimi minuti.',
    now: 'ora',
    main: 'principale',
    running: 'in corso',
    error: 'errore',
    alt: (calls, lanes) => `Attività: ${calls} chiamate in ${lanes} corsie`,
    altEmpty: 'Nessuna attività recente',
  },
  toolsBoard: {
    title: 'STRUMENTI',
    counts: (calls, errors) => `${calls} CHIAMATE${errors > 0 ? ` · ${errors} ${errors === 1 ? 'ERRORE' : 'ERRORI'}` : ''}`,
    empty: 'Ancora nessuna chiamata.',
    more: (tools, calls) =>
      `+ ${tools === 1 ? 'un altro strumento' : `altri ${tools} strumenti`} · ${plural(calls, 'chiamata', 'chiamate')}`,
    alt: list => `Strumenti più usati: ${list}`,
    altEmpty: 'Nessuno strumento usato',
  },
  files: {
    title: 'FILE TOCCATI',
    counts: (edited, total) => `${edited} MODIFICATI · ${total} TOTALI`,
    empty: 'Nessun file letto o modificato.',
    edits: n => `${n} mod`,
    reads: n => `${n} lett`,
    alt: n => `${n} file toccati`,
    altEmpty: 'Nessun file',
  },
  pane: {
    title: 'Regia',
    command: 'Apre la Regia: agenti, skill, strumenti e contesto in tempo reale',
    opened: 'Regia aperta.',
    status: n => `Regia · ${n} ${n === 1 ? 'agente' : 'agenti'} in corso`,
    compact: 'Compatta',
    expand: 'Espandi',
    reset: 'Azzera statistiche',
    resetShort: 'Azzera',
    alts: {
      radar: 'Radar della regia', meters: 'Contesto e limiti', agents: 'Agenti al lavoro',
      skills: 'Skill caricate', timeline: 'Attività nel tempo', tools: 'Strumenti più usati', files: 'File toccati',
    },
  },
  terminal: {
    live: '● IN ONDA',
    idle: '○ IN ATTESA',
    turn: (n, clock) => `turno ${n} · ${clock}`,
    context: 'contesto',
    out: v => `· out ${v}`,
    five: pct => `· 5 ore ${pct}%`,
    agents: 'AGENTI',
    noAgents: 'nessun subagente',
    calls: n => `${n} strum.`,
    skills: 'SKILL',
    none: 'nessuna',
    tools: 'STRUMENTI',
  },
}

export const STRINGS                        = { en, it }

export const langOf = (value         )       => (value === 'it' ? 'it' : 'en')
