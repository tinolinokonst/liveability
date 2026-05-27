"use client";

import { useState } from "react";
import AddressCompare from "@/components/AddressCompare";
import NeighborhoodFinder from "@/components/NeighborhoodFinder";

const TABS = [
  { key: "compare",      label: "Compare addresses",   desc: "Side-by-side breakdown of any two NYC addresses" },
  { key: "neighborhoods", label: "Find a neighborhood", desc: "Rank NYC neighborhoods by what matters to you"   },
] as const;

type Tab = typeof TABS[number]["key"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("compare");

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-base font-medium text-gray-900">liveability</span>
            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">NYC beta</span>
          </div>
          <span className="text-xs text-gray-400">Real cost of living · not just rent</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-medium text-gray-900 mb-3 leading-tight">
            Find where you can<br />actually live well in NYC.
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-lg">
            Rent is one number. Your quality of life is nine. Air quality, noise, sunlight, green space — 
            we surface what listing sites hide.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-sm text-gray-400 mb-6">
          {TABS.find(t => t.key === tab)?.desc}
        </p>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {tab === "compare"       && <AddressCompare />}
          {tab === "neighborhoods" && <NeighborhoodFinder />}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>liveability · NYC beta · 2025</span>
          <span>Data: EPA · PurpleAir · MTA GTFS · NYC Open Data · OpenStreetMap</span>
        </footer>
      </div>
    </main>
  );
}