"use client";

import { useState } from "react";
import { WeightConfig, Neighborhood } from "@/lib/types";
import { NEIGHBORHOODS } from "@/lib/mockData";

const PRESETS: { label: string; key: string; weights: WeightConfig }[] = [
  { label: "Balanced",     key: "balanced", weights: { afford: 50, air: 20, green: 15, transit: 15 } },
  { label: "Clean air",    key: "air",      weights: { afford: 20, air: 50, green: 20, transit: 10 } },
  { label: "Lowest cost",  key: "budget",   weights: { afford: 80, air: 10, green: 5,  transit: 5  } },
  { label: "Commute",      key: "commute",  weights: { afford: 30, air: 10, green: 10, transit: 50 } },
];

const NOTE_QUALITY: Record<string, "good" | "mid" | "bad"> = {
  "Affordable": "good", "Clean air": "good", "Parks nearby": "good",
  "Inwood Hill Park": "good", "Van Cortlandt Park": "good", "Forest Park": "good",
  "Waterfront views": "good", "Low crime trend": "good", "Safe": "good",
  "Hidden gem": "good", "Quieter": "good",
  "Poor air": "bad", "Industrial air": "bad",
  "Up-and-coming": "mid", "Avg air quality": "mid", "Avg transit": "mid",
  "Decent transit": "mid", "Less transit": "mid",
};

const noteStyle = (note: string) => {
  const q = NOTE_QUALITY[note] ?? "mid";
  if (q === "good") return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (q === "bad")  return "bg-red-50 text-red-800 border border-red-200";
  return "bg-gray-100 text-gray-600";
};

function calcScore(hood: Neighborhood, w: WeightConfig): number {
  const total = w.afford + w.air + w.green + w.transit || 1;
  return Math.round(
    (hood.afford * w.afford + hood.air * w.air + hood.green * w.green + hood.transit * w.transit) / total
  );
}

const SLIDERS: { key: keyof WeightConfig; label: string; icon: string }[] = [
  { key: "afford",  label: "Affordability", icon: "🏠" },
  { key: "air",     label: "Air quality",   icon: "💨" },
  { key: "green",   label: "Green space",   icon: "🌳" },
  { key: "transit", label: "Transit",       icon: "🚇" },
];

export default function NeighborhoodFinder() {
  const [weights, setWeights] = useState<WeightConfig>({ afford: 50, air: 20, green: 15, transit: 15 });
  const [activePreset, setActivePreset] = useState("balanced");

  const ranked = [...NEIGHBORHOODS]
    .map(h => ({ ...h, score: calcScore(h, weights) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.key);
    setWeights(preset.weights);
  };

  const updateWeight = (key: keyof WeightConfig, val: number) => {
    setActivePreset("custom");
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="w-full">
      {/* Preset pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activePreset === p.key
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {SLIDERS.map(({ key, label, icon }) => (
          <div key={key} className="bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <span>{icon}</span>{label}
              </span>
              <span className="text-sm font-medium text-gray-900">{weights[key]}%</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={5}
              value={weights[key]}
              onChange={e => updateWeight(key, Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2.5">
        {ranked.map((hood, i) => (
          <div
            key={hood.name}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-white transition-all ${
              i === 0 ? "border-blue-400 border-2" : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <div className="text-sm font-medium text-gray-300 w-5">{i + 1}</div>
            <div className="flex-1 min-w-0">
              {i === 0 && (
                <div className="text-xs font-medium text-blue-600 mb-0.5">Best match</div>
              )}
              <div className="text-sm font-medium text-gray-900 mb-1.5">{hood.name}</div>
              <div className="flex gap-1.5 flex-wrap">
                {hood.notes.map(note => (
                  <span key={note} className={`text-xs px-2 py-0.5 rounded-full ${noteStyle(note)}`}>
                    {note}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-medium text-gray-900">{hood.score}</div>
              <div className="text-xs text-gray-400">${hood.rent.toLocaleString()}/mo</div>
              <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden mt-1.5 ml-auto">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${hood.score}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}