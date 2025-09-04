import { describe, it, expect } from "bun:test"
import { fuzzyFilterAndSort } from "./fuzzySearch"
import type { HasLabelValue } from "./fuzzySearch"

const options: HasLabelValue[] = [
  { value: "gdp_const_lcu", label: "GDP (constant LCU)" },
  { value: "gdp_capita", label: "GDP per capita (current US$)" },
  { value: "unemp_rate", label: "Unemployment rate" },
  { value: "male_unemp_rate", label: "Male unemployment rate" },
  { value: "female_unemp_rate", label: "Female unemployment rate" },
  { value: "renewables_waste", label: "Combustible renewables and waste (% of total energy)" },
  { value: "renewables_elec", label: "Renewable electricity output (% of total electricity output)" },
  { value: "co2_total", label: "CO2 emissions (kt)" },
]

describe("fuzzyFilterAndSort", () => {
  it("returns original list when query empty", () => {
    const result = fuzzyFilterAndSort(options, "")
    expect(result.length).toBe(options.length)
  })

  it("ranks exact phrase above qualified variants", () => {
    const result = fuzzyFilterAndSort(options, "unemployment rate")
    const first = result[0]
    expect(first.label.toLowerCase()).toBe("unemployment rate")
    const maleIdx = result.findIndex(o => o.label.toLowerCase() === "male unemployment rate")
    const baseIdx = result.findIndex(o => o.label.toLowerCase() === "unemployment rate")
    expect(baseIdx).toBeLessThan(maleIdx)
  })

  it("handles common typo and still surfaces correct base phrase first", () => {
    const result = fuzzyFilterAndSort(options, "unemploymnet rate")
    expect(result[0].label.toLowerCase()).toBe("unemployment rate")
  })

  it("prioritizes direct substring semantic matches (renewables) over unrelated GDP", () => {
    const result = fuzzyFilterAndSort(options, "renewables")
    // Ensure at least one renewables item appears before any GDP item
    const firstGdpIdx = result.findIndex(o => o.label.startsWith("GDP"))
    const firstRenewIdx = result.findIndex(o => /renewable|renewables/.test(o.label.toLowerCase()))
    expect(firstRenewIdx).toBeGreaterThanOrEqual(0)
    if (firstGdpIdx !== -1) {
      expect(firstRenewIdx).toBeLessThan(firstGdpIdx)
    }
  })

  it("does not return empty results for distant but overlapping token", () => {
    const result = fuzzyFilterAndSort(options, "renewable X")
    expect(result.length).toBeGreaterThan(0)
  })

  it("keeps at least the overlapping items when query tokens partially match", () => {
    const result = fuzzyFilterAndSort(options, "male rate")
    const hasMale = result.some(o => o.label.toLowerCase() === "male unemployment rate")
    expect(hasMale).toBeTrue()
  })
})
