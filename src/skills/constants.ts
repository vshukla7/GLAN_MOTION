import { SKILL_NAMES } from "./index";

export const SKILL_DISPLAY_NAMES: Record<typeof SKILL_NAMES[number], string> = {
    "charts": "Charts",
    "typography": "Typography",
    "social-media": "Social Media",
    "transitions": "Transitions",
    "sequencing": "Sequencing",
    "spring-physics": "Animation",
};

export const SKILL_DESCRIPTIONS: Record<typeof SKILL_NAMES[number], string> = {
    "charts": "Data visualizations, graphs, histograms, bar charts",
    "typography": "Kinetic text, typewriter effects, text animations",
    "social-media": "Instagram stories, TikTok content, vertical video",
    "transitions": "Scene changes, fades, slide transitions, wipes",
    "sequencing": "Multiple elements appearing at different times",
    "spring-physics": "Bouncy animations, organic motion, elastic effects",
};

export const SKILL_CATEGORIES = {
    guidance: SKILL_NAMES,
    examples: [] as const,
} as const;
