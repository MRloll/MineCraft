import { resources } from "./blocks.js";

export const PLAYER_SPAWN = [32, 15, 32];
export const CHUNK_SIZE = { width: 32, height: 20 };

export function createWorldParams(seed = 0) {
  return {
    seed,
    terrain: { scale: 30, magnitude: 0.3, offset: 0.2, waterOffset: 3 },
    trees: {
      trunk: { minHeight: 6, maxHeight: 9 },
      canopy: { minRadius: 3, maxRadius: 4, density: 0.5 },
      frequency: 0.015,
    },
    clouds: { scale: 30, density: 0.35 },
    resources: Object.fromEntries(resources.map((resource) => [
      resource.name,
      { scale: { ...resource.scale }, scarcity: resource.scarcity },
    ])),
  };
}

function mergeNumbers(target, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Invalid world settings");
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) continue;
    if (typeof target[key] === "object") {
      mergeNumbers(target[key], source[key]);
    } else if (typeof source[key] === "number" && Number.isFinite(source[key])) {
      target[key] = source[key];
    } else {
      throw new Error("Invalid world setting: " + key);
    }
  }
}

export function parseWorldParams(value) {
  const params = createWorldParams();
  mergeNumbers(params, value);
  const { terrain, trees, clouds } = params;
  const inRange = (value, min, max) => value >= min && value <= max;
  if (
    terrain.scale <= 0 || clouds.scale <= 0 ||
    !inRange(terrain.magnitude, 0, 1) || !inRange(terrain.offset, 0, 1) ||
    !inRange(terrain.waterOffset, 0, CHUNK_SIZE.height - 1) ||
    !inRange(trees.frequency, 0, 1) || !inRange(trees.canopy.density, 0, 1) ||
    !inRange(clouds.density, 0, 1) ||
    !inRange(trees.trunk.minHeight, 0, CHUNK_SIZE.height) ||
    !inRange(trees.trunk.maxHeight, 0, CHUNK_SIZE.height) ||
    !inRange(trees.canopy.minRadius, 0, CHUNK_SIZE.width / 2) ||
    !inRange(trees.canopy.maxRadius, 0, CHUNK_SIZE.width / 2)
  ) {
    throw new Error("World settings are out of range");
  }
  for (const resource of Object.values(params.resources)) {
    if (!inRange(resource.scarcity, 0, 1) || Object.values(resource.scale).some((scale) => scale <= 0)) {
      throw new Error("Invalid resource settings");
    }
  }
  return params;
}

// Keep the objects used by GUI controls alive when a saved game is loaded.
export function assignWorldParams(target, source) {
  for (const key of Object.keys(target)) {
    if (typeof target[key] === "object") assignWorldParams(target[key], source[key]);
    else target[key] = source[key];
  }
}
