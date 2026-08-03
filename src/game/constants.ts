/**
 * Shared layout constants. Kept free of scene imports so UI and scene modules
 * can depend on them without creating an import cycle through the game config.
 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 32;
/** Exterior building shell thickness (inner face inset from lot edge). */
export const WALL_T = 14;
/**
 * Ortho camera sits SE of the follow target (matches TownRenderer).
 * Internal-wall occlusion uses the XZ offset to test camera→player rays.
 */
export const CAM_OFFSET_X = 165;
export const CAM_OFFSET_Z = 285;
