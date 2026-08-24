export const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const

export type DieType = (typeof DIE_TYPES)[number]

export const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
}

export interface RolledDie {
  id: number
  type: DieType
  value: number
}

const randomInt = (min: number, max: number) => {
  const range = max - min + 1
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return min + (buffer[0] % range)
}

/** Rolls a single die of the given type.
 *  d100 is rolled the traditional percentile way:
 *  a tens die (00–90) plus a ones die (0–9); 00 counts as 100. */
export function rollDie(type: DieType): number {
  if (type === "d100") {
    const tens = randomInt(0, 9) * 10
    const ones = randomInt(0, 9)
    return tens + ones === 0 ? 100 : tens + ones
  }
  return randomInt(1, DIE_SIDES[type])
}

/** Builds a formula string like "2d6 + 1d20 + 3" from a pool and modifier. */
export function buildFormula(pool: DieType[], modifier: number): string | null {
  if (pool.length === 0 && modifier === 0) return null

  const counts = new Map<DieType, number>()
  for (const type of pool) {
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  let formula = [...counts.entries()]
    .map(([type, count]) => `${count}${type}`)
    .join(" + ")

  if (modifier !== 0) {
    const term = `${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`
    formula = formula ? `${formula} ${term}` : term
  }

  return formula === "" ? null : formula
}

/* ------------------------------------------------------------------ */
/* Stage entries                                                       */
/* ------------------------------------------------------------------ */

export type Variant = "std" | "tens" | "ones"

export interface StageEntry {
  key: string
  variant: Variant
  type: DieType
  label: string
  highlight: "max" | "min" | null
}

/** Rolls above this count fall back to lightweight 2D animation. */
export const THREE_DICE_LIMIT = 8

/** Expands rolls for the stage; d100 becomes a percentile pair of d10s. */
export function expandRolls(rolls: RolledDie[]): StageEntry[] {
  const entries: StageEntry[] = []
  for (const die of rolls) {
    if (die.type === "d100") {
      // Tens faces read 00–90 (never "01"), matching real percentile dice;
      // 00+0 renders as 100.
      const tens = (Math.floor(die.value / 10) % 10) * 10
      const ones = die.value % 10
      entries.push(
        {
          key: `${die.id}-t`,
          variant: "tens",
          type: die.type,
          label: String(tens).padStart(2, "0"),
          highlight: null,
        },
        {
          key: `${die.id}-o`,
          variant: "ones",
          type: die.type,
          label: String(ones),
          highlight: null,
        }
      )
    } else {
      entries.push({
        key: String(die.id),
        variant: "std",
        type: die.type,
        label: String(die.value),
        highlight:
          die.value === DIE_SIDES[die.type]
            ? "max"
            : die.value === 1
              ? "min"
              : null,
      })
    }
  }
  return entries
}
