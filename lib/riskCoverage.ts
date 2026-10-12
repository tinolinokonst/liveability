// Which cantons' hazard maps and contaminated-site cadastres Liveability may
// query, and how to credit each one. Generated from the geodienste.ch service
// catalog (https://geodienste.ch/info/services.json) on 2026-10-12, then checked
// against each canton's linked terms of use.
//
// A canton is covered only when BOTH its download service (used for the site
// polygons and point queries) and its map service are "Frei erhältlich" and its
// declared open-data terms are "Freie Nutzung" (optionally with mandatory
// source credit). Anything else — approval required, commercial use only with
// permission, no declared terms, not yet published — is excluded, and the app
// shows "Not available for this canton" rather than guessing.
//
// This list is static on purpose: a canton must not start being queried just
// because the catalog changed, before someone has read its terms. To change
// it, re-check the catalog fields above and the canton's terms, then edit here.

export type RiskDataset = 'hazards' | 'contamination'

export interface CantonSource {
  name: string
  /** The canton's terms of use for this dataset, or the geodienste.ch dataset page */
  termsUrl: string
  /** "Freie Nutzung" terms that require a source credit */
  creditRequired: boolean
}

export interface ExcludedCanton {
  name: string
  reason: string
}

export const HAZARD_COVERED: Record<string, CantonSource> = {
  AG: { name: "Aargau", termsUrl: "https://www.ag.ch/geoportal/geodatenshop/Nutzungsbedingungen.aspx?Typ=NutzungsbedingungenAGIS1", creditRequired: true },
  AI: { name: "Appenzell Innerrhoden", termsUrl: "https://geodienste.ch/pdfs/AI/gefahrenkarten/data/Nutzungsbedingungen_AI_annex-123-2.pdf", creditRequired: true },
  AR: { name: "Appenzell Ausserrhoden", termsUrl: "https://ar.ch/fileadmin/user_upload/Departement_Bau_Volkswirtschaft/Amt_fuer_Raum_Wald/Geoinformation_und_Vermessung/AR_Nutzungsbedingungen_Geodaten.pdf", creditRequired: false },
  BE: { name: "Bern", termsUrl: "https://geofiles.be.ch/internet/geo/geodaten/agi-dv-nutzungsbedingungen-de.pdf", creditRequired: true },
  BL: { name: "Basel-Landschaft", termsUrl: "https://www.baselland.ch/politik-und-behorden/direktionen/volkswirtschafts-und-gesundheitsdirektion/amt-fur-geoinformation/geoportal/geodaten/nutzung-von-geodaten", creditRequired: true },
  FR: { name: "Fribourg", termsUrl: "https://geodienste.ch/services/gefahrenkarten", creditRequired: true },
  GE: { name: "Geneva", termsUrl: "https://sitg.ge.ch/ressources/conditions-utilisation-donnees", creditRequired: true },
  GL: { name: "Glarus", termsUrl: "https://geodienste.ch/pdfs/GL/gefahrenkarten/data/ktgl-ogd-geo-20180601.pdf", creditRequired: false },
  JU: { name: "Jura", termsUrl: "https://geo.jura.ch/geodonnees/Conditions_utilisation_geodonnees.pdf", creditRequired: true },
  LU: { name: "Lucerne", termsUrl: "https://geoportal.lu.ch/geodaten/nutzungsbedingungen", creditRequired: true },
  SH: { name: "Schaffhausen", termsUrl: "https://geodienste.ch/services/gefahrenkarten", creditRequired: false },
  SO: { name: "Solothurn", termsUrl: "https://geodienste.ch/services/gefahrenkarten", creditRequired: false },
  SZ: { name: "Schwyz", termsUrl: "https://geodienste.ch/pdfs/SZ/gefahrenkarten/data/Open%20Data%20Lizenz%20AWN.pdf", creditRequired: true },
  TG: { name: "Thurgau", termsUrl: "https://geodienste.ch/services/gefahrenkarten", creditRequired: true },
  TI: { name: "Ticino", termsUrl: "https://www4.ti.ch/dt/sg/sai/ugeo/temi/geoportale-ticino/geoportale/condizioni-utilizzo/", creditRequired: true },
  VS: { name: "Valais", termsUrl: "https://geodienste.ch/services/gefahrenkarten", creditRequired: true },
  ZG: { name: "Zug", termsUrl: "https://zg.ch/de/planen-bauen/geoinformation/geoinformationen-nutzen/nutzungsbedingungen", creditRequired: true },
  ZH: { name: "Zurich", termsUrl: "https://geo.zh.ch/terms-of-use", creditRequired: false },
}

export const HAZARD_EXCLUDED: Record<string, ExcludedCanton> = {
  BS: { name: "Basel-Stadt", reason: "Dataset not yet published (in preparation)" },
  GR: { name: "Graubünden", reason: "No open-data terms declared on geodienste.ch, and the canton's terms document could not be reviewed" },
  NE: { name: "Neuchâtel", reason: "Commercial use only with the canton's permission" },
  NW: { name: "Nidwalden", reason: "Download requires approval from the canton, and no open-data terms are declared" },
  OW: { name: "Obwalden", reason: "Download requires approval from the canton, and no open-data terms are declared" },
  SG: { name: "St. Gallen", reason: "Terms allow use only in free-of-charge apps (sg.ch Nutzungsbedingungen §18b), i.e. no commercial use" },
  UR: { name: "Uri", reason: "Download requires approval from the canton; commercial use only with permission" },
  VD: { name: "Vaud", reason: "Download requires approval from the canton, and no open-data terms are declared" },
}

export const CONTAMINATION_COVERED: Record<string, CantonSource> = {
  AG: { name: "Aargau", termsUrl: "https://www.ag.ch/geoportal/geodatenshop/Nutzungsbedingungen.aspx?Typ=NutzungsbedingungenAGIS1", creditRequired: true },
  AI: { name: "Appenzell Innerrhoden", termsUrl: "https://geodienste.ch/pdfs/AI/kataster_belasteter_standorte/data/Nutzungsbedingungen_AI_annex-123-2.pdf", creditRequired: true },
  AR: { name: "Appenzell Ausserrhoden", termsUrl: "https://ar.ch/fileadmin/user_upload/Departement_Bau_Volkswirtschaft/Amt_fuer_Raum_Wald/Geoinformation_und_Vermessung/AR_Nutzungsbedingungen_Geodaten.pdf", creditRequired: false },
  BE: { name: "Bern", termsUrl: "https://www.agi.dij.be.ch/de/start/geoportal/geodaten/detail.html?type=geoproduct&code=BALISKBS", creditRequired: true },
  BL: { name: "Basel-Landschaft", termsUrl: "https://www.baselland.ch/politik-und-behorden/direktionen/volkswirtschafts-und-gesundheitsdirektion/amt-fur-geoinformation/geoportal/geodaten/nutzung-von-geodaten", creditRequired: true },
  BS: { name: "Basel-Stadt", termsUrl: "https://www.bs.ch/bvd/grundbuch-und-vermessungsamt/geo/anwendungen/agb#oeffentliche-geodaten", creditRequired: true },
  FR: { name: "Fribourg", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: true },
  GE: { name: "Geneva", termsUrl: "https://sitg.ge.ch/ressources/conditions-utilisation-donnees", creditRequired: true },
  GL: { name: "Glarus", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: false },
  JU: { name: "Jura", termsUrl: "https://geo.jura.ch/geodonnees/Conditions_utilisation_geodonnees.pdf", creditRequired: true },
  LU: { name: "Lucerne", termsUrl: "https://geoportal.lu.ch/geodaten/nutzungsbedingungen", creditRequired: true },
  NE: { name: "Neuchâtel", termsUrl: "https://sitn.ne.ch/geoshop2_media/documents/contrat_sitn.pdf", creditRequired: true },
  SH: { name: "Schaffhausen", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: false },
  SO: { name: "Solothurn", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: false },
  SZ: { name: "Schwyz", termsUrl: "https://geodienste.ch/pdfs/SZ/kataster_belasteter_standorte/data/Open%20Data%20Lizenz%20AFU.pdf", creditRequired: true },
  TG: { name: "Thurgau", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: true },
  TI: { name: "Ticino", termsUrl: "https://www4.ti.ch/dt/sg/sai/ugeo/temi/geoportale-ticino/geoportale/condizioni-utilizzo/", creditRequired: true },
  UR: { name: "Uri", termsUrl: "https://www.lisag.ch/nutzungsbestimmungen-gis-uri", creditRequired: true },
  VS: { name: "Valais", termsUrl: "https://geodienste.ch/services/kataster_belasteter_standorte", creditRequired: true },
  ZG: { name: "Zug", termsUrl: "https://zg.ch/de/planen-bauen/geoinformation/geoinformationen-nutzen/nutzungsbedingungen", creditRequired: true },
  ZH: { name: "Zurich", termsUrl: "https://geo.zh.ch/terms-of-use", creditRequired: false },
}

export const CONTAMINATION_EXCLUDED: Record<string, ExcludedCanton> = {
  GR: { name: "Graubünden", reason: "No open-data terms declared on geodienste.ch, and the canton's terms document could not be reviewed" },
  NW: { name: "Nidwalden", reason: "Download requires approval from the canton, and no open-data terms are declared" },
  OW: { name: "Obwalden", reason: "Download requires approval from the canton, and no open-data terms are declared" },
  SG: { name: "St. Gallen", reason: "Terms allow use only in free-of-charge apps (sg.ch Nutzungsbedingungen §18b), i.e. no commercial use" },
  VD: { name: "Vaud", reason: "Download requires approval from the canton, and no open-data terms are declared" },
}

export function cantonSource(dataset: RiskDataset, canton: string): CantonSource | null {
  return (dataset === 'hazards' ? HAZARD_COVERED : CONTAMINATION_COVERED)[canton] ?? null
}
