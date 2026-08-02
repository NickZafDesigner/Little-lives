import type { NeedsState } from "./types";

export type TvShowId = "comedy" | "action" | "horror";

export type TvMusicTrack = "tv_comedy" | "tv_action" | "tv_horror";

export interface TvShowDef {
  id: TvShowId;
  title: string;
  channel: string;
  blurb: string;
  /** Applied when you finish / stop after watching a bit. */
  needDeltas: Partial<NeedsState>;
  music: TvMusicTrack;
  toast: string;
  /** Early flip-away snack if you bail almost immediately. */
  snackToast: string;
}

export const TV_SHOWS: TvShowDef[] = [
  {
    id: "comedy",
    title: "Silly Cats",
    channel: "CH 3 · Comedy",
    blurb: "Cat antics - mood soars",
    needDeltas: { fun: 40, social: 6, energy: -4 },
    music: "tv_comedy",
    toast: "Those cats are ridiculous!",
    snackToast: "Missed the yarn bit…",
  },
  {
    id: "action",
    title: "Turbo Dash",
    channel: "CH 7 · Action",
    blurb: "Thrills up, energy down",
    needDeltas: { fun: 30, energy: -12, social: -3 },
    music: "tv_action",
    toast: "What a chase sequence!",
    snackToast: "Credits already?!",
  },
  {
    id: "horror",
    title: "Midnight Moan",
    channel: "CH 13 · Horror",
    blurb: "Spooky fun… and jump scares",
    needDeltas: { fun: 22, energy: -6, social: -8, bladder: -14 },
    music: "tv_horror",
    toast: "Yikes - that got me!",
    snackToast: "Too scary. Off!",
  },
];

export const tvShowById: Record<TvShowId, TvShowDef> = Object.fromEntries(
  TV_SHOWS.map((s) => [s.id, s]),
) as Record<TvShowId, TvShowDef>;
