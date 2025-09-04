// Fuzzy search and ranking utility for option labels.
// The goal: tolerate small typos (e.g. "unemploymnet") and rank closer / more specific
// matches higher. Exact or near-exact base phrase ("unemployment rate") should outrank
// prefixed variants ("male unemployment rate").

export interface HasLabelValue {
  value: string
  label: string
}

interface ScoredOption<T extends HasLabelValue> {
  item: T
  score: number
}

// Basic Levenshtein distance (small strings => fine). Optimized with two rolling arrays.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// Compute fuzzy score: lower is better.
function computeScore<T extends HasLabelValue>(query: string, option: T): number {
  const qRaw = query.trim()
  const labelRaw = option.label.trim()
  const q = qRaw.toLowerCase()
  const label = labelRaw.toLowerCase()
  if (!q) return 0

  if (label === q) return -10 // absolute best

  // Direct substring handling gets highest priority
  const idx = label.indexOf(q)
  if (idx !== -1) {
    // Tokenize to understand context
    const tokens = label.split(/\s+/)
    const qTokens = q.split(/\s+/)
    // Count tokens before and after the exact substring span
    // Roughly locate which token index the substring starts in
    let cumulative = 0
    let startTokenIndex = 0
    for (let i = 0; i < tokens.length; i++) {
      if (cumulative <= idx && idx < cumulative + tokens[i].length + 1) {
        startTokenIndex = i
        break
      }
      cumulative += tokens[i].length + 1
    }
    const tokensBefore = startTokenIndex
    const tokensAfter = Math.max(0, tokens.length - (startTokenIndex + qTokens.length))
    // Penalize extra tokens slightly so base phrase ranks ahead of qualified variants
    return -5
      + tokensBefore * 0.15
      + tokensAfter * 0.05
      + (idx / Math.max(1, label.length)) * 0.1
  }

  // Token-level fuzzy scoring when no direct substring
  const qTokens = q.split(/\s+/)
  const lTokens = label.split(/\s+/)

  let tokenDistanceAccum = 0
  let matched = 0
  for (const qt of qTokens) {
    let best = Infinity
    for (const lt of lTokens) {
      const d = levenshtein(qt, lt)
      if (d < best) best = d
      if (best === 0) break
    }
    const norm = best / Math.max(1, qt.length)
    if (best <= Math.max(1, Math.floor(qt.length * 0.5))) matched++
    tokenDistanceAccum += norm
  }
  const avgTokenDistance = tokenDistanceAccum / qTokens.length // 0 (best) -> large

  // Whole-string Levenshtein as a secondary factor
  const whole = levenshtein(q, label) / Math.max(1, q.length)

  // Penalize missing tokens (not matched fuzzily)
  const missingPenalty = (qTokens.length - matched) * 0.25

  // Slight length divergence penalty so extremely long unrelated labels sink a bit
  const lengthDivergence = Math.abs(label.length - q.length) / Math.max(label.length, q.length)

  return avgTokenDistance * 1.2 + whole * 0.4 + missingPenalty + lengthDivergence * 0.2
}

export function fuzzyFilterAndSort<T extends HasLabelValue>(options: T[], query: string): T[] {
  const q = query.trim()
  if (!q) return options

  const scored: ScoredOption<T>[] = []
  for (const opt of options) {
    const score = computeScore(q, opt)
    const label = opt.label.toLowerCase()
    const qLower = q.toLowerCase()
    const hasBasicOverlap = label.includes(qLower) || qLower.split(/\s+/).some(t => t && label.includes(t))

    // Much more permissive: only discard if score is VERY poor and no overlap
    if (score > 6 && !hasBasicOverlap) continue
    scored.push({ item: opt, score })
  }

  if (scored.length === 0) {
    const simple = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    return simple.length ? simple : options
  }

  scored.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
  return scored.map(s => s.item)
}
