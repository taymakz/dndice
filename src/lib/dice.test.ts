import { describe, expect, it } from "vitest"

import {
  DIE_SIDES,
  DIE_TYPES,
  buildFormula,
  expandRolls,
  rollDie,
} from "./dice"

/** Face labels actually printed on a percentile tens die. */
const TENS_FACE_LABELS = Array.from({ length: 10 }, (_, i) =>
  String(i * 10).padStart(2, "0")
)
const ONES_FACE_LABELS = Array.from({ length: 10 }, (_, i) => String(i))

const d100 = (value: number) => expandRolls([{ id: 1, type: "d100", value }])

describe("rollDie", () => {
  for (const type of DIE_TYPES) {
    it(`rolls ${type} within 1..${DIE_SIDES[type]}`, () => {
      for (let i = 0; i < 500; i++) {
        const value = rollDie(type)
        expect(Number.isInteger(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(DIE_SIDES[type])
      }
    })
  }

  it("d100 hits both ends of the range across many rolls", () => {
    const seen = new Set<number>()
    for (let i = 0; i < 20000 && seen.size < 100; i++) seen.add(rollDie("d100"))
    expect(seen.size).toBe(100)
  })
})

describe("d100 percentile expansion (regression: wrong tens face)", () => {
  it("every value maps to a real tens face label — never a padded digit like '04'", () => {
    for (let value = 1; value <= 100; value++) {
      const entries = d100(value)
      expect(entries).toHaveLength(2)

      const [tens, ones] = entries
      expect(tens.variant).toBe("tens")
      expect(ones.variant).toBe("ones")
      // The exact failure mode of the old bug: label missing from the
      // die faces made the renderer fall back to the "00" face.
      expect(TENS_FACE_LABELS).toContain(tens.label)
      expect(ONES_FACE_LABELS).toContain(ones.label)
    }
  })

  it("tens label is the decade (40 → “40”), not the padded digit (“04”)", () => {
    for (let value = 1; value <= 100; value++) {
      const expected = String(Math.floor(value / 10) % 10 * 10).padStart(2, "0")
      expect(d100(value)[0].label).toBe(expected)
    }
  })

  it("reads 40 as 40|0", () => {
    const [tens, ones] = d100(40)
    expect(tens.label).toBe("40")
    expect(ones.label).toBe("0")
  })

  it("reads 2 as 00|2", () => {
    const [tens, ones] = d100(2)
    expect(tens.label).toBe("00")
    expect(ones.label).toBe("2")
  })

  it("reads 100 as 00|0 (percentile convention)", () => {
    const [tens, ones] = d100(100)
    expect(tens.label).toBe("00")
    expect(ones.label).toBe("0")
  })

  it("pair labels recombine to the rolled value (00+0 counts as 100)", () => {
    for (let value = 1; value <= 100; value++) {
      const [tens, ones] = d100(value)
      const t = Number.parseInt(tens.label, 10)
      const o = Number.parseInt(ones.label, 10)
      const combined = t === 0 && o === 0 ? 100 : t + o
      expect(combined).toBe(value)
    }
  })

  it("gives each pair member a unique key derived from the die id", () => {
    const entries = expandRolls([
      { id: 7, type: "d100", value: 55 },
      { id: 8, type: "d100", value: 100 },
    ])
    expect(new Set(entries.map((e) => e.key)).size).toBe(4)
  })
})

describe("standard dice expansion", () => {
  it.each(DIE_TYPES.filter((t) => t !== "d100"))(
    "%s stays a single std entry carrying its value and highlight",
    (type) => {
      const entries = expandRolls([{ id: 3, type, value: DIE_SIDES[type] }])
      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({
        key: "3",
        variant: "std",
        type,
        label: String(DIE_SIDES[type]),
        highlight: "max",
      })
      expect(expandRolls([{ id: 3, type, value: 1 }])[0].highlight).toBe("min")
      expect(
        expandRolls([{ id: 3, type, value: Math.min(2, DIE_SIDES[type]) }])[0]
          .highlight
      ).toBeNull()
    }
  )
})

describe("buildFormula", () => {
  it("counts duplicate dice", () => {
    expect(buildFormula(["d6", "d6", "d20"], 0)).toBe("2d6 + 1d20")
  })

  it("appends the modifier with a single sign", () => {
    expect(buildFormula(["d4"], 3)).toBe("1d4 + 3")
    expect(buildFormula(["d4"], -2)).toBe("1d4 - 2")
    expect(buildFormula(["d6", "d6", "d20"], -1)).toBe("2d6 + 1d20 - 1")
    expect(buildFormula([], 5)).toBe("+ 5")
  })

  it("returns null for an empty pool without modifier", () => {
    expect(buildFormula([], 0)).toBeNull()
  })
})
