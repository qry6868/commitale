import type { PersonaId, Wrapped } from '../stats.ts';

export interface Theme {
  /** Three background stops, top-left to bottom-right. */
  bg: [string, string, string];
  /** Two soft glows on the background. */
  glow: [string, string];
  /** Kicker and label text. */
  accent: string;
  /** Heatmap levels 0 (no commits) to 4. */
  heat: [string, string, string, string, string];
}

const EMPTY = 'rgba(255,255,255,0.08)';

// One look per personality, so cards people share don't all look the same.
const THEMES: Record<PersonaId, Theme> = {
  nightOwl: {
    bg: ['#0b1026', '#16245c', '#0f1d4a'],
    glow: ['#3b82f6', '#8b5cf6'],
    accent: '#93c5fd',
    heat: [EMPTY, '#1e3a8a', '#2563eb', '#60a5fa', '#bfdbfe'],
  },
  earlyBird: {
    bg: ['#2a1206', '#7c2d12', '#831843'],
    glow: ['#f59e0b', '#f472b6'],
    accent: '#fdba74',
    heat: [EMPTY, '#9a3412', '#ea580c', '#fb923c', '#fde68a'],
  },
  weekendWarrior: {
    bg: ['#1f0a0a', '#7f1d1d', '#431407'],
    glow: ['#ef4444', '#f97316'],
    accent: '#fca5a5',
    heat: [EMPTY, '#991b1b', '#dc2626', '#f87171', '#fecaca'],
  },
  marathoner: {
    bg: ['#052e16', '#14532d', '#064e3b'],
    glow: ['#22c55e', '#14b8a6'],
    accent: '#86efac',
    heat: [EMPTY, '#166534', '#16a34a', '#4ade80', '#bbf7d0'],
  },
  bugHunter: {
    bg: ['#1c1a05', '#3f3a0b', '#422006'],
    glow: ['#eab308', '#84cc16'],
    accent: '#fde047',
    heat: [EMPTY, '#854d0e', '#ca8a04', '#facc15', '#fef08a'],
  },
  cleaner: {
    bg: ['#042f2e', '#134e4a', '#0c4a6e'],
    glow: ['#06b6d4', '#2dd4bf'],
    accent: '#67e8f9',
    heat: [EMPTY, '#155e75', '#0891b2', '#22d3ee', '#a5f3fc'],
  },
  polyglot: {
    bg: ['#0f172a', '#134e4a', '#4c1d95'],
    glow: ['#14b8a6', '#a855f7'],
    accent: '#5eead4',
    heat: [EMPTY, '#0f766e', '#14b8a6', '#a855f7', '#f0abfc'],
  },
  nineToFive: {
    bg: ['#0f172a', '#1e293b', '#1e3a5f'],
    glow: ['#64748b', '#0ea5e9'],
    accent: '#7dd3fc',
    heat: [EMPTY, '#334155', '#0369a1', '#0ea5e9', '#bae6fd'],
  },
  aiCommander: {
    bg: ['#0a0a1f', '#1e0b3b', '#06283d'],
    glow: ['#22d3ee', '#d946ef'],
    accent: '#67e8f9',
    heat: [EMPTY, '#155e75', '#0891b2', '#d946ef', '#f5d0fe'],
  },
  builder: {
    bg: ['#1a1033', '#2a1150', '#3b0d3a'],
    glow: ['#8b5cf6', '#ec4899'],
    accent: '#c4b5fd',
    heat: [EMPTY, '#4c3bcf', '#8b5cf6', '#d946ef', '#fb7185'],
  },
};

export function themeFor(w: Wrapped): Theme {
  return THEMES[w.personas[0]];
}
