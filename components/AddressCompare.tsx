"use client";

import { useState } from "react";
import { AddressData, MetricScore } from "@/lib/types";
import { SAMPLE_ADDRESSES, METRICS_META } from "@/lib/mockData";

const qualityStyles: Record<MetricScore["quality"], string> = {
  good: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  mid:  "bg-amber-50 text-amber-800 border border-amber-200",
  bad:  "bg-red-50 text-red-800 border border-red-200",
};

const barColors = ["bg-blue-600", "bg-emerald-600"];

function ScoreBar({ score, colorClass }: { score: number; colorClass: string }) {
  return (
    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export default function AddressCompare() {
  const [addresses] = useState<AddressData[]>(SAMPLE_ADDRESSES);
  const [inputA, setInputA] = useState(SAMPLE_ADDRESSES[0].fullAddress);
  const [inputB, setInputB] = useState(SAMPLE_ADDRESSES[1].fullAddress);

  const dotColors = ["bg-blue-600", "bg-emerald-600"];
  const borderColors = ["border-blue-500", "border-emerald-500"];
  const textColors = ["text-blue-700", "text-emerald-700"];

  return (
    <div className="w-full">
      {/* Address inputs */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[inputA, inputB].map((val, i) => (
          <div key={i} className="relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColors[i]}`} />
            <input
              type="text"
              value={val}
              onChange={(e) => i === 0 ? setInputA(e.target.value) : setInputB(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
              placeholder={`Address ${i === 0 ? "A" : "B"}`}
            />
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
        {/* Table header */}
        <div className="grid grid-cols-[180px_1fr_1fr] bg-gray-50 border-b border-gray-100">
          <div className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Metric</div>
          {addresses.map((addr, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColors[i]}`} />
                <span className="text-sm font-medium text-gray-800 truncate">{addr.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {METRICS_META.map((meta, rowIdx) => {
          const scores = addresses.map(a => a.metrics[meta.key].score);
          const winnerIdx = scores[0] >= scores[1] ? 0 : 1;

          return (
            <div
              key={meta.key}
              className={`grid grid-cols-[180px_1fr_1fr] border-b border-gray-50 last:border-b-0 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
            >
              <div className="px-4 py-3.5 flex items-center gap-2 text-sm text-gray-500">
                <span className="text-base">{meta.icon}</span>
                {meta.label}
              </div>
              {addresses.map((addr, i) => {
                const m = addr.metrics[meta.key];
                const isWinner = winnerIdx === i;
                return (
                  <div key={i} className="px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${qualityStyles[m.quality]}`}>
                        {m.tag}
                      </span>
                      <ScoreBar score={m.score} colorClass={barColors[i]} />
                      {isWinner && (
                        <span className={`text-xs font-medium ${textColors[i]}`}>✓</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{m.raw}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {addresses.map((addr, i) => {
          const isLeader = addr.overallScore >= (addresses[1 - i]?.overallScore ?? 0);
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 bg-white ${isLeader ? `${borderColors[i]} border-2` : "border-gray-100"}`}
            >
              {isLeader && (
                <div className={`text-xs font-medium mb-1.5 ${textColors[i]}`}>Overall leader</div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-0.5">{addr.label}</div>
                  <div className="text-xs text-gray-400">
                    Wins {METRICS_META.filter((m) => {
                      const scores = addresses.map(a => a.metrics[m.key].score);
                      return (i === 0 ? scores[0] >= scores[1] : scores[1] > scores[0]);
                    }).length} of {METRICS_META.length} metrics
                  </div>
                </div>
                <div className="text-3xl font-medium text-gray-900">{addr.overallScore}</div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Strongest</span>
                  <span className="text-gray-700">{addr.strengths.join(" · ")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weakest</span>
                  <span className="text-gray-700">{addr.weaknesses.join(" · ")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data note */}
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Address-level data uses EPA sensor interpolation, PurpleAir hyperlocal sensors, MTA GTFS proximity, NYC Open Data crime stats, and OpenStreetMap green space radius. Updated weekly. Real API connections coming soon.
      </p>
    </div>
  );
}