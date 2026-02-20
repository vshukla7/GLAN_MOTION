export const MODELS = [
  // Google Gemini (Only supported provider)
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Glan m1 Mini" },
  { id: "gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export type StreamPhase = "idle" | "reasoning" | "generating";

export type GenerationErrorType = "validation" | "api";
