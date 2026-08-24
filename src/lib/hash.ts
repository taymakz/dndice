/** Deterministic 32-bit string hash used for render-safe pseudo-randomness. */
export function hashString(text: string): number {
  let h = 0
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return Math.abs(h)
}
