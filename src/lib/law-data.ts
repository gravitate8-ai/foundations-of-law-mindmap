// Law data type definitions and loader
export type LawQuestion = {
  qnum: string;
  question: string;
  answer: string;
};

export type LawTopic = {
  num: number;
  title: string;
  key_concepts: string[];
  questions: LawQuestion[];
};

export type LawData = {
  title: string;
  subtitle: string;
  topics: LawTopic[];
};

import lawData from "./law-data.json";

export const LAW_DATA = lawData as LawData;

// A warm, distinctive palette for 14 topics (no blue/indigo per skill guidance)
export const TOPIC_COLORS = [
  { bg: "#fef3c7", fg: "#7c2d12", accent: "#d97706", ring: "#fbbf24" }, // amber
  { bg: "#fce7f3", fg: "#831843", accent: "#be185d", ring: "#f472b6" }, // rose
  { bg: "#dcfce7", fg: "#14532d", accent: "#16a34a", ring: "#4ade80" }, // green
  { bg: "#ffedd5", fg: "#7c2d12", accent: "#ea580c", ring: "#fb923c" }, // orange
  { bg: "#fae8ff", fg: "#581c87", accent: "#9333ea", ring: "#c084fc" }, // purple
  { bg: "#ecfccb", fg: "#365314", accent: "#65a30d", ring: "#a3e635" }, // lime
  { bg: "#ffe4e6", fg: "#881337", accent: "#e11d48", ring: "#fb7185" }, // pink-red
  { bg: "#ccfbf1", fg: "#134e4a", accent: "#0d9488", ring: "#2dd4bf" }, // teal
  { bg: "#f5f5f4", fg: "#44403c", accent: "#78716c", ring: "#a8a29e" }, // stone
  { bg: "#fef9c3", fg: "#713f12", accent: "#ca8a04", ring: "#facc15" }, // yellow
  { bg: "#ede9fe", fg: "#4c1d95", accent: "#7c3aed", ring: "#a78bfa" }, // violet
  { bg: "#d1fae5", fg: "#064e3b", accent: "#059669", ring: "#34d399" }, // emerald
  { bg: "#fee2e2", fg: "#7f1d1d", accent: "#b91c1c", ring: "#f87171" }, // red
  { bg: "#e0e7ff", fg: "#312e81", accent: "#4f46e5", ring: "#818cf8" }, // indigo (only 1 of 14, kept light)
];

export function getTopicColor(num: number) {
  return TOPIC_COLORS[(num - 1) % TOPIC_COLORS.length];
}

export function getAllQuestions() {
  return LAW_DATA.topics.flatMap((t) =>
    t.questions.map((q) => ({ ...q, topicNum: t.num, topicTitle: t.title }))
  );
}
