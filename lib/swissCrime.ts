// Canton-level crime rates for Switzerland.
//
// Source: Swiss Federal Statistical Office (FSO)
//  - Offences: Police Crime Statistics (PKS) 2024, criminal offences registered
//    by the police under the Swiss Criminal Code, by canton
//    (STAT-TAB cube px-x-1903020100_101, offence total 311.00.T0, year 2024).
//  - Population: Permanent resident population 2024
//    (STAT-TAB cube px-x-0102010000_101).
// Rates are offences per 1,000 permanent residents, computed from those two
// official tables. Retrieved from the FSO STAT-TAB API on 2026-07-14.
//
// This is canton-level data — it carries no address-level precision and is
// clearly labeled as such wherever it is displayed.

export interface CantonCrime {
  name: string
  offences: number
  population: number
  ratePer1000: number
}

export const CANTON_CRIME_2024: Record<string, CantonCrime> = {
  ZH: { name: 'Zürich', offences: 110240, population: 1620020, ratePer1000: 68.0 },
  BE: { name: 'Bern', offences: 73469, population: 1071216, ratePer1000: 68.6 },
  LU: { name: 'Luzern', offences: 22232, population: 437944, ratePer1000: 50.8 },
  UR: { name: 'Uri', offences: 976, population: 38275, ratePer1000: 25.5 },
  SZ: { name: 'Schwyz', offences: 5469, population: 168931, ratePer1000: 32.4 },
  OW: { name: 'Obwalden', offences: 1684, population: 39662, ratePer1000: 42.5 },
  NW: { name: 'Nidwalden', offences: 1436, population: 45345, ratePer1000: 31.7 },
  GL: { name: 'Glarus', offences: 1620, population: 42371, ratePer1000: 38.2 },
  ZG: { name: 'Zug', offences: 5036, population: 133739, ratePer1000: 37.7 },
  FR: { name: 'Fribourg', offences: 15770, population: 346674, ratePer1000: 45.5 },
  SO: { name: 'Solothurn', offences: 23018, population: 289792, ratePer1000: 79.4 },
  BS: { name: 'Basel-Stadt', offences: 30939, population: 201384, ratePer1000: 153.6 },
  BL: { name: 'Basel-Landschaft', offences: 15776, population: 301323, ratePer1000: 52.4 },
  SH: { name: 'Schaffhausen', offences: 5298, population: 88667, ratePer1000: 59.8 },
  AR: { name: 'Appenzell Ausserrhoden', offences: 2293, population: 56705, ratePer1000: 40.4 },
  AI: { name: 'Appenzell Innerrhoden', offences: 525, population: 16733, ratePer1000: 31.4 },
  SG: { name: 'St. Gallen', offences: 26093, population: 540036, ratePer1000: 48.3 },
  GR: { name: 'Graubünden', offences: 10088, population: 206138, ratePer1000: 48.9 },
  AG: { name: 'Aargau', offences: 35415, population: 735808, ratePer1000: 48.1 },
  TG: { name: 'Thurgau', offences: 14010, population: 299509, ratePer1000: 46.8 },
  TI: { name: 'Ticino', offences: 14962, population: 358903, ratePer1000: 41.7 },
  VD: { name: 'Vaud', offences: 64015, population: 855106, ratePer1000: 74.9 },
  VS: { name: 'Valais', offences: 14046, population: 371288, ratePer1000: 37.8 },
  NE: { name: 'Neuchâtel', offences: 13034, population: 179518, ratePer1000: 72.6 },
  GE: { name: 'Genève', offences: 52146, population: 531102, ratePer1000: 98.2 },
  JU: { name: 'Jura', offences: 3978, population: 74840, ratePer1000: 53.2 },
}

export const CRIME_DATA_YEAR = 2024

// Map a canton offence rate (per 1,000 residents; observed range ~25-154) to a
// 0-100 safety score. Uri (25.5) ≈ 86, Zürich (68.0) ≈ 63, Genève (98.2) ≈ 46,
// Basel-Stadt (153.6) ≈ 16.
export function safetyScoreForRate(ratePer1000: number): number {
  return Math.round(Math.max(10, Math.min(95, 100 - ratePer1000 * 0.55)))
}
