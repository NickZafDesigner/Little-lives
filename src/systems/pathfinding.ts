export interface GridPos {
  x: number;
  y: number;
}

interface Node extends GridPos {
  g: number;
  f: number;
  parent: Node | null;
}

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * A* over the tile grid. Accepts a set of acceptable goals so callers can ask
 * for "any tile next to the fridge" rather than one exact square.
 */
export function findPathToAny(
  collision: boolean[][],
  start: GridPos,
  goals: GridPos[],
  maxWidth: number,
  maxHeight: number,
): GridPos[] {
  if (goals.length === 0) return [];

  const goalKeys = new Set(goals.map((g) => `${g.x},${g.y}`));
  if (goalKeys.has(`${start.x},${start.y}`)) return [{ ...start }];

  const heuristic = (x: number, y: number) => {
    let best = Infinity;
    for (const g of goals) {
      const d = manhattan(x, y, g.x, g.y);
      if (d < best) best = d;
    }
    return best;
  };

  const open: Node[] = [];
  const bestG = new Map<string, number>();
  const closed = new Set<string>();

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    f: heuristic(start.x, start.y),
    parent: null,
  };
  open.push(startNode);
  bestG.set(`${start.x},${start.y}`, 0);

  let guard = 0;
  while (open.length > 0 && guard++ < 20000) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const currentKey = `${current.x},${current.y}`;
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (goalKeys.has(currentKey)) {
      const path: GridPos[] = [];
      let n: Node | null = current;
      while (n) {
        path.push({ x: n.x, y: n.y });
        n = n.parent;
      }
      return path.reverse();
    }

    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx < 0 || ny < 0 || nx >= maxWidth || ny >= maxHeight) continue;
      const key = `${nx},${ny}`;
      if (closed.has(key)) continue;
      // The goal tile itself may be occupied (e.g. standing on a doorway edge).
      if (collision[ny][nx] && !goalKeys.has(key)) continue;

      const g = current.g + 1;
      const known = bestG.get(key);
      if (known !== undefined && known <= g) continue;
      bestG.set(key, g);
      open.push({ x: nx, y: ny, g, f: g + heuristic(nx, ny), parent: current });
    }
  }

  return [];
}

export function findPath(
  collision: boolean[][],
  start: GridPos,
  goal: GridPos,
  maxWidth: number,
  maxHeight: number,
): GridPos[] {
  if (
    goal.x < 0 ||
    goal.y < 0 ||
    goal.x >= maxWidth ||
    goal.y >= maxHeight ||
    collision[goal.y]?.[goal.x]
  ) {
    return [];
  }
  return findPathToAny(collision, start, [goal], maxWidth, maxHeight);
}

/** Closest walkable tile to a target, searched in rings. */
export function nearestWalkable(
  collision: boolean[][],
  target: GridPos,
  maxWidth: number,
  maxHeight: number,
  maxRadius = 4,
): GridPos | null {
  if (
    target.x >= 0 &&
    target.y >= 0 &&
    target.x < maxWidth &&
    target.y < maxHeight &&
    !collision[target.y][target.x]
  ) {
    return target;
  }
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = target.x + dx;
        const y = target.y + dy;
        if (x < 0 || y < 0 || x >= maxWidth || y >= maxHeight) continue;
        if (!collision[y][x]) return { x, y };
      }
    }
  }
  return null;
}
