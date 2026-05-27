import { AddressData, Neighborhood } from "./types";

export const SAMPLE_ADDRESSES: AddressData[] = [
  {
    label: "350 E 52nd St",
    fullAddress: "350 E 52nd St, Manhattan, NY",
    overallScore: 61,
    strengths: ["Transit", "Walkability", "Grocery"],
    weaknesses: ["Noise", "Sunlight", "Green space"],
    metrics: {
      rent:       { raw: "$2,650/mo",              score: 38, tag: "Above avg",        quality: "mid"  },
      aqi:        { raw: "AQI 68 — Moderate",       score: 54, tag: "Moderate",         quality: "mid"  },
      noise:      { raw: "71 dB — Heavy traffic",   score: 25, tag: "Loud",             quality: "bad"  },
      transit:    { raw: "3 lines, 4 min walk",     score: 92, tag: "Excellent",        quality: "good" },
      greenSpace: { raw: "0.4 acres in 800m",       score: 28, tag: "Scarce",           quality: "bad"  },
      walkability:{ raw: "Walk score 96",           score: 96, tag: "Walker's paradise",quality: "good" },
      sunlight:   { raw: "3.1 hrs/day avg",         score: 35, tag: "Low light",        quality: "bad"  },
      grocery:    { raw: "4 stores, 6 min walk",    score: 88, tag: "Excellent",        quality: "good" },
      safety:     { raw: "+4% crime vs prior yr",   score: 52, tag: "Rising slightly",  quality: "mid"  },
    },
  },
  {
    label: "812 Wyckoff Ave",
    fullAddress: "812 Wyckoff Ave, Ridgewood, NY",
    overallScore: 72,
    strengths: ["Air quality", "Noise", "Sunlight"],
    weaknesses: ["Transit", "Grocery", "Rent value"],
    metrics: {
      rent:       { raw: "$1,920/mo",              score: 74, tag: "Affordable",    quality: "good" },
      aqi:        { raw: "AQI 44 — Good",           score: 78, tag: "Good",          quality: "good" },
      noise:      { raw: "58 dB — Residential",     score: 72, tag: "Quiet",         quality: "good" },
      transit:    { raw: "2 lines, 7 min walk",     score: 71, tag: "Good",          quality: "good" },
      greenSpace: { raw: "2.1 acres in 800m",       score: 68, tag: "Decent",        quality: "mid"  },
      walkability:{ raw: "Walk score 82",           score: 82, tag: "Very walkable", quality: "good" },
      sunlight:   { raw: "5.8 hrs/day avg",         score: 78, tag: "Bright",        quality: "good" },
      grocery:    { raw: "2 stores, 9 min walk",    score: 62, tag: "Decent",        quality: "mid"  },
      safety:     { raw: "-8% crime vs prior yr",   score: 76, tag: "Improving",     quality: "good" },
    },
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { name: "Jackson Heights, Queens",  afford: 78, air: 62, green: 55, transit: 85, rent: 1950, notes: ["Affordable", "Diverse food scene", "Avg air quality"] },
  { name: "Astoria, Queens",          afford: 65, air: 65, green: 60, transit: 80, rent: 2350, notes: ["Good transit", "Low crime trend", "Parks nearby"] },
  { name: "Inwood, Manhattan",        afford: 70, air: 75, green: 88, transit: 72, rent: 2100, notes: ["Inwood Hill Park", "Cleaner air", "Quieter"] },
  { name: "Ridgewood, Queens",        afford: 75, air: 68, green: 50, transit: 75, rent: 2050, notes: ["Up-and-coming", "Affordable", "Decent transit"] },
  { name: "Sunset Park, Brooklyn",    afford: 72, air: 55, green: 65, transit: 78, rent: 2080, notes: ["Near waterfront", "Industrial air", "Good subway"] },
  { name: "Kingsbridge, Bronx",       afford: 85, air: 60, green: 72, transit: 70, rent: 1750, notes: ["Most affordable", "Van Cortlandt Park", "Avg transit"] },
  { name: "East Williamsburg, BK",    afford: 50, air: 58, green: 40, transit: 82, rent: 2700, notes: ["Great nightlife", "Poor air", "Excellent transit"] },
  { name: "Forest Hills, Queens",     afford: 55, air: 80, green: 78, transit: 76, rent: 2500, notes: ["Clean air", "Forest Park", "Safe"] },
  { name: "Bay Ridge, Brooklyn",      afford: 62, air: 72, green: 62, transit: 65, rent: 2250, notes: ["Waterfront views", "Quieter", "Less transit"] },
  { name: "Marble Hill, Manhattan",   afford: 80, air: 74, green: 68, transit: 68, rent: 1900, notes: ["Hidden gem", "Underrated", "Near parks"] },
];

export const METRICS_META: {
  key: keyof AddressData["metrics"];
  label: string;
  icon: string;
  winnerIs: "higher" | "lower";
}[] = [
  { key: "rent",        label: "Monthly rent",       icon: "🏠", winnerIs: "higher" },
  { key: "aqi",         label: "Air quality",         icon: "💨", winnerIs: "higher" },
  { key: "noise",       label: "Noise level",         icon: "🔊", winnerIs: "higher" },
  { key: "transit",     label: "Transit access",      icon: "🚇", winnerIs: "higher" },
  { key: "greenSpace",  label: "Green space",         icon: "🌳", winnerIs: "higher" },
  { key: "walkability", label: "Walkability",         icon: "👟", winnerIs: "higher" },
  { key: "sunlight",    label: "Sunlight",            icon: "☀️", winnerIs: "higher" },
  { key: "grocery",     label: "Grocery access",      icon: "🛒", winnerIs: "higher" },
  { key: "safety",      label: "Crime trend",         icon: "🛡️", winnerIs: "higher" },
];