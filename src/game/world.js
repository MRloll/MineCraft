import { WorldChunk } from "./worldChunk.js";
import { DataStore } from "./dataStore.js";
import { blocks, blocksById } from "./blocks.js";
import { assignWorldParams, CHUNK_SIZE, createWorldParams, parseWorldParams, PLAYER_SPAWN } from "./settings.js";

const SAVE_KEY = "minecraft_save_v2";
const chunkKey = (x, z) => [x, z].join(",");

function scheduleIdle(callback) {
  if (typeof globalThis.requestIdleCallback === "function" && typeof globalThis.cancelIdleCallback === "function") {
    const id = globalThis.requestIdleCallback(callback, { timeout: 1000 });
    return () => globalThis.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(callback, 0);
  return () => globalThis.clearTimeout(id);
}

// This store contains voxel data only. React subscribes to chunk membership and
// each chunk's revision; no renderer objects or React state updates are needed per frame.
export class World {
  chunks = new Map();
  pending = new Map();
  listeners = new Set();
  snapshot = [];
  dataStore = new DataStore();
  asyncLoading = true;
  drawDistance = 2;
  loadedDrawDistance = null;
  generation = 0;

  constructor({ seed = 0, chunkSize = CHUNK_SIZE, schedule = scheduleIdle } = {}) {
    this.chunkSize = { ...chunkSize };
    this.params = createWorldParams(seed);
    this.schedule = schedule;
    this.center = {
      x: Math.floor(PLAYER_SPAWN[0] / chunkSize.width),
      z: Math.floor(PLAYER_SPAWN[2] / chunkSize.width),
    };
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  publish() {
    this.snapshot = [...this.chunks.values()].filter((chunk) => chunk.loaded);
    this.listeners.forEach((listener) => listener());
  }

  getVisibleCoords() {
    const distance = Math.max(0, Math.min(5, Math.floor(this.drawDistance)));
    const visible = [];
    for (let x = this.center.x - distance; x <= this.center.x + distance; x++) {
      for (let z = this.center.z - distance; z <= this.center.z + distance; z++) {
        visible.push({ x, z, key: chunkKey(x, z) });
      }
    }
    return visible;
  }

  generate(clearEdits = false) {
    this.clear(false);
    if (clearEdits) this.dataStore.clear();
    for (const { x, z } of this.getVisibleCoords()) this.generateChunk(x, z, false);
    this.loadedDrawDistance = this.drawDistance;
    this.publish();
  }

  update(position) {
    const { chunk } = this.worldToChunkCoords(position.x, position.y, position.z);
    if (
      chunk.x === this.center.x && chunk.z === this.center.z &&
      this.loadedDrawDistance === this.drawDistance
    ) return;

    this.center = { x: chunk.x, z: chunk.z };
    this.loadedDrawDistance = this.drawDistance;
    const visible = this.getVisibleCoords();
    const keys = new Set(visible.map((coords) => coords.key));

    for (const [key, current] of this.chunks) {
      if (keys.has(key)) continue;
      this.pending.get(key)?.();
      this.pending.delete(key);
      this.chunks.delete(key);
      this.invalidateNeighbors(current.coords.x, current.coords.z);
    }
    for (const { x, z, key } of visible) {
      const isPlayerChunk = x === chunk.x && z === chunk.z;
      const existing = this.chunks.get(key);
      if (existing) {
        if (isPlayerChunk && !existing.loaded) {
          this.pending.get(key)?.();
          this.pending.delete(key);
          existing.generate();
          this.invalidateNeighbors(x, z);
        }
        continue;
      }
      this.generateChunk(x, z, this.asyncLoading && !isPlayerChunk);
    }
    this.publish();
  }

  generateChunk(x, z, defer) {
    const key = chunkKey(x, z);
    const chunk = new WorldChunk(
      this.chunkSize, this.params, this.dataStore, x, z,
      (worldX, y, worldZ) => this.getBlock(worldX, y, worldZ),
    );
    this.chunks.set(key, chunk);
    const generation = this.generation;
    const generate = () => {
      if (this.generation !== generation || this.chunks.get(key) !== chunk) return;
      this.pending.delete(key);
      chunk.generate();
      this.invalidateNeighbors(x, z);
      if (defer) this.publish();
    };

    if (defer) this.pending.set(key, this.schedule(generate));
    else generate();
    return chunk;
  }

  invalidateNeighbors(x, z) {
    for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const neighbor = this.getChunk(x + dx, z + dz);
      if (neighbor?.loaded) neighbor.invalidate();
    }
  }

  clear(notify = true) {
    this.generation++;
    this.pending.forEach((cancel) => cancel());
    this.pending.clear();
    this.chunks.clear();
    this.loadedDrawDistance = null;
    if (notify) this.publish();
  }

  getChunk(x, z) {
    return this.chunks.get(chunkKey(x, z)) ?? null;
  }

  worldToChunkCoords(x, y, z) {
    const chunk = {
      x: Math.floor(x / this.chunkSize.width),
      z: Math.floor(z / this.chunkSize.width),
    };
    return {
      chunk,
      block: {
        x: x - chunk.x * this.chunkSize.width,
        y,
        z: z - chunk.z * this.chunkSize.width,
      },
    };
  }

  getBlock(x, y, z) {
    if (![x, y, z].every(Number.isInteger)) return null;
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);
    return chunk?.loaded ? chunk.getBlock(coords.block.x, y, coords.block.z) : null;
  }

  addBlock(x, y, z, id) {
    if (!Number.isInteger(id) || !blocksById[id] || id === blocks.empty.id) return false;
    return this.editBlock(x, y, z, id, true);
  }

  removeBlock(x, y, z) {
    return this.editBlock(x, y, z, blocks.empty.id, false);
  }

  editBlock(x, y, z, id, requireEmpty) {
    const current = this.getBlock(x, y, z);
    if (!current || (requireEmpty ? current.id !== 0 : current.id === 0)) return false;
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);
    const { x: localX, z: localZ } = coords.block;
    chunk.setBlockId(localX, y, localZ, id);
    this.dataStore.set(chunk.position.x, chunk.position.z, localX, y, localZ, id);
    chunk.invalidate();

    // An edit on a seam can expose or hide a face in the adjacent chunk.
    if (localX === 0) this.getChunk(coords.chunk.x - 1, coords.chunk.z)?.invalidate();
    if (localX === this.chunkSize.width - 1) this.getChunk(coords.chunk.x + 1, coords.chunk.z)?.invalidate();
    if (localZ === 0) this.getChunk(coords.chunk.x, coords.chunk.z - 1)?.invalidate();
    if (localZ === this.chunkSize.width - 1) this.getChunk(coords.chunk.x, coords.chunk.z + 1)?.invalidate();
    return true;
  }

  save(storage) {
    try {
      const target = storage ?? globalThis.localStorage;
      target.setItem(SAVE_KEY, JSON.stringify({
        version: 2, params: this.params, data: this.dataStore.data,
      }));
      return "GAME SAVED";
    } catch {
      return "UNABLE TO SAVE GAME";
    }
  }

  load(storage) {
    try {
      const target = storage ?? globalThis.localStorage;
      const saved = target.getItem(SAVE_KEY);
      const payload = saved ? JSON.parse(saved) : null;
      if (saved && (!payload || payload.version !== 2)) throw new Error("Unsupported saved game");
      const params = payload ? payload.params : JSON.parse(target.getItem("mincraft_params"));
      const data = payload ? payload.data : JSON.parse(target.getItem("mincraft_data"));
      if (!params || !data) return "NO SAVED GAME";
      const nextParams = parseWorldParams(params);
      const nextData = DataStore.parse(data, this.chunkSize);
      assignWorldParams(this.params, nextParams);
      this.dataStore.data = nextData;
      this.generate();
      return "GAME LOADED";
    } catch {
      return "SAVED GAME IS INVALID";
    }
  }
}
