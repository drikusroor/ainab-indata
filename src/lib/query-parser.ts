import { fuzzyFilterAndSort, type HasLabelValue } from './fuzzySearch'

export interface ParsedQuery {
  countries: { code: string; name: string; matchedToken: string }[]
  series: { code: string; name: string; matchedToken: string }[]
  view: 'explorer' | 'correlation' | 'gapminder' | 'similarity' | 'trends' | null
  raw: string
}

// Keywords that hint at a specific view
const VIEW_KEYWORDS: Record<string, ParsedQuery['view']> = {
  'compare': 'explorer',
  'explore': 'explorer',
  'explorer': 'explorer',
  'correlate': 'correlation',
  'correlation': 'correlation',
  'scatter': 'correlation',
  'vs': 'correlation',
  'versus': 'correlation',
  'similar': 'similarity',
  'similarity': 'similarity',
  'like': 'similarity',
  'trend': 'trends',
  'trends': 'trends',
  'predict': 'trends',
  'forecast': 'trends',
  'prediction': 'trends',
  'gapminder': 'gapminder',
  'animate': 'gapminder',
  'animation': 'gapminder',
  'bubble': 'gapminder',
  'play': 'gapminder',
}

// Common filler words to skip
const STOP_WORDS = new Set([
  'for', 'and', 'the', 'in', 'of', 'with', 'to', 'a', 'an', 'show',
  'me', 'display', 'chart', 'graph', 'data', 'between', 'over', 'time',
])

/**
 * Parse a natural language query into structured matches.
 *
 * Strategy:
 * 1. Extract view keywords first
 * 2. Try matching remaining phrases against series (greedy, longest match first)
 * 3. Try matching remaining words against countries
 * 4. Use fuzzy matching with a quality threshold
 */
export function parseQuery(
  raw: string,
  countries: HasLabelValue[],
  series: HasLabelValue[]
): ParsedQuery {
  const result: ParsedQuery = { countries: [], series: [], view: null, raw }

  if (!raw.trim()) return result

  // Normalize
  const normalized = raw.toLowerCase().trim()
  const words = normalized.split(/[\s,]+/).filter(Boolean)

  // 1. Extract view keywords
  const remainingWords: string[] = []
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '')
    if (VIEW_KEYWORDS[cleanWord]) {
      result.view = VIEW_KEYWORDS[cleanWord]
    } else if (!STOP_WORDS.has(cleanWord) && cleanWord.length > 0) {
      remainingWords.push(word)
    }
  }

  if (remainingWords.length === 0) return result

  const usedIndices = new Set<number>()
  const countryMatches: ParsedQuery['countries'] = []
  const seriesMatches: ParsedQuery['series'] = []

  // 2. Extract countries first (they're typically 1-2 words and easier to identify)
  for (let i = 0; i < remainingWords.length; i++) {
    if (usedIndices.has(i)) continue

    const word = remainingWords[i]

    // Try exact country code match (3 chars or fewer)
    if (word.length <= 3) {
      const codeMatch = countries.find(c => c.value.toLowerCase() === word.toLowerCase())
      if (codeMatch) {
        countryMatches.push({ code: codeMatch.value, name: codeMatch.label, matchedToken: word })
        usedIndices.add(i)
        continue
      }
    }

    // Try two-word country name first (e.g. "south africa", "united states")
    if (i + 1 < remainingWords.length && !usedIndices.has(i + 1)) {
      const twoWords = remainingWords[i] + ' ' + remainingWords[i + 1]
      const matches = fuzzyFilterAndSort(countries, twoWords)
      if (matches.length > 0 && phraseMatchQuality(twoWords, matches[0].label) < 0.4) {
        countryMatches.push({ code: matches[0].value, name: matches[0].label, matchedToken: twoWords })
        usedIndices.add(i)
        usedIndices.add(i + 1)
        continue
      }
    }

    // Try single word as country — prefer exact case-insensitive substring match first
    const exactCountryMatch = countries.find(c => c.label.toLowerCase() === word.toLowerCase())
    if (exactCountryMatch) {
      countryMatches.push({ code: exactCountryMatch.value, name: exactCountryMatch.label, matchedToken: word })
      usedIndices.add(i)
      continue
    }

    // Substring match — word must be a substantial part of the country name
    const substringCountryMatch = countries.find(c => {
      const label = c.label.toLowerCase()
      const w = word.toLowerCase()
      return label.includes(w) && w.length >= 4 && w.length >= label.length * 0.4
    })
    if (substringCountryMatch) {
      countryMatches.push({ code: substringCountryMatch.value, name: substringCountryMatch.label, matchedToken: word })
      usedIndices.add(i)
      continue
    }

    // Fuzzy match — require at least 4 chars for fuzzy country matching to avoid noise
    if (word.length < 4) continue
    const countryHits = fuzzyFilterAndSort(countries, word)
    const countryScore = countryHits.length > 0 ? phraseMatchQuality(word, countryHits[0].label) : 1

    if (countryScore < 0.5) {
      countryMatches.push({ code: countryHits[0].value, name: countryHits[0].label, matchedToken: word })
      usedIndices.add(i)
    }
  }

  // 3. Try remaining words as series (greedy phrase matching)
  const seriesWords = remainingWords.filter((_, i) => !usedIndices.has(i))
  if (seriesWords.length > 0) {
    // Try the full remaining phrase first, then progressively shorter
    // Stop once we find the first good match (longest phrase wins)
    let foundSeries = false
    for (let len = seriesWords.length; len >= 2 && !foundSeries; len--) {
      for (let start = 0; start <= seriesWords.length - len && !foundSeries; start++) {
        const phrase = seriesWords.slice(start, start + len).join(' ')
        const matches = fuzzyFilterAndSort(series, phrase)

        if (matches.length > 0) {
          const score = phraseMatchQuality(phrase, matches[0].label)
          if (score < 0.6) {
            seriesMatches.push({ code: matches[0].value, name: matches[0].label, matchedToken: phrase })
            foundSeries = true
          }
        }
      }
    }

    // Only try individual words if no series found via phrases
    if (seriesMatches.length === 0 && seriesWords.length > 0) {
      for (const word of seriesWords) {
        const hits = fuzzyFilterAndSort(series, word)
        if (hits.length > 0 && phraseMatchQuality(word, hits[0].label) < 0.5) {
          seriesMatches.push({ code: hits[0].value, name: hits[0].label, matchedToken: word })
          break // just take the best single-word match
        }
      }
    }
  }

  // Deduplicate
  const seenCountries = new Set<string>()
  for (const c of countryMatches) {
    if (!seenCountries.has(c.code)) {
      seenCountries.add(c.code)
      result.countries.push(c)
    }
  }
  const seenSeries = new Set<string>()
  for (const s of seriesMatches) {
    if (!seenSeries.has(s.code)) {
      seenSeries.add(s.code)
      result.series.push(s)
    }
  }

  // Infer view if not explicitly set
  if (!result.view) {
    if (result.series.length >= 2) {
      result.view = 'correlation'
    } else if (result.series.length === 1 && result.countries.length >= 1) {
      result.view = 'explorer'
    }
  }

  return result
}

/**
 * Simple quality score for how well a phrase matches a label.
 * Returns 0 (perfect) to 1 (terrible).
 */
function phraseMatchQuality(phrase: string, label: string): number {
  const p = phrase.toLowerCase()
  const l = label.toLowerCase()

  // Exact substring = great
  if (l.includes(p)) return 0.05

  // Token overlap
  const pTokens = p.split(/\s+/)
  const lTokens = l.split(/\s+/)

  let matchedTokens = 0
  for (const pt of pTokens) {
    for (const lt of lTokens) {
      if (lt.includes(pt) || pt.includes(lt)) {
        matchedTokens++
        break
      }
      // Fuzzy single-token match (allow ~30% char errors)
      const maxDist = Math.max(2, Math.floor(pt.length * 0.4))
      if (levenshteinQuick(pt, lt) <= maxDist) {
        matchedTokens++
        break
      }
    }
  }

  return 1 - matchedTokens / pTokens.length
}

function levenshteinQuick(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}
