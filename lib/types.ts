export interface MetricScore {
  raw: string;
  score: number; // 0–100
  tag: string;
  quality: "good" | "mid" | "bad";
}

export interface AddressData {
  label: string;
  fullAddress: string;
  metrics: {
    rent: MetricScore;
    aqi: MetricScore;
    noise: MetricScore;
    transit: MetricScore;
    greenSpace: MetricScore;
    walkability: MetricScore;
    sunlight: MetricScore;
    grocery: MetricScore;
    safety: MetricScore;
  };
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
}

export interface Neighborhood {
  name: string;
  afford: number;
  air: number;
  green: number;
  transit: number;
  rent: number;
  notes: string[];
}

export interface WeightConfig {
  afford: number;
  air: number;
  green: number;
  transit: number;
}