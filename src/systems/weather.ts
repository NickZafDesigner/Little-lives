import type { WeatherId } from "../data/types";

export type { WeatherId };

export function weatherLabel(weather: WeatherId): string {
  return weather === "rain" ? "Rainy" : "Clear skies";
}

/** Compact chip label for the HUD money/time strip. */
export function weatherHudLabel(weather: WeatherId): string {
  return weather === "rain" ? "Rain" : "Clear";
}

export function weatherToast(weather: WeatherId): string {
  return weather === "rain"
    ? "Rainy day — soft grey skies over the village."
    : "Clear day — good light for a stroll.";
}

export function weatherThought(weather: WeatherId): string | null {
  if (weather !== "rain") return null;
  const lines = [
    "Oh — rain. Shoes and plans, brace yourselves.",
    "Grey skies… cosy if I stay near a window.",
    "Rain on the cottage roof sounds kind of nice.",
  ];
  return lines[Math.floor(Math.random() * lines.length)] ?? null;
}

/**
 * Deterministic daily roll from dayIndex so reloads keep the same sky.
 * Slightly stickier rain if yesterday was wet.
 */
export function rollWeather(
  dayIndex: number,
  previous: WeatherId | null = null,
): WeatherId {
  const n = Math.sin(dayIndex * 12.9898 + 78.233) * 43758.5453;
  const r = n - Math.floor(n);
  const chance = previous === "rain" ? 0.4 : 0.3;
  return r < chance ? "rain" : "clear";
}

/**
 * Ensure `state.weather` matches `state.dayIndex`.
 * Returns true when a new roll happened (useful for morning toast).
 */
export function ensureWeather(state: {
  dayIndex: number;
  weather: WeatherId;
  weatherDay: number;
}): boolean {
  if (state.weatherDay === state.dayIndex) return false;
  const prev =
    state.weatherDay > 0 && state.weatherDay === state.dayIndex - 1
      ? state.weather
      : null;
  state.weather = rollWeather(state.dayIndex, prev);
  state.weatherDay = state.dayIndex;
  return true;
}
