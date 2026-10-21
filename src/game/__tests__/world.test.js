import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../world.js";
import { blocks } from "../blocks.js";

function flatWorld(options = {}) {
  const world = new World({ chunkSize: { width: 4, height: 8 }, ...options });
  world.center = { x: 0, z: 0 };
  world.drawDistance = 1;
  world.asyncLoading = false;
  Object.assign(world.params.terrain, { magnitude: 0, offset: 0.5, waterOffset: 0 });
  world.params.trees.frequency = 0;
  world.params.clouds.density = 0;
  Object.values(world.params.resources).forEach((resource) => { resource.scarcity = 1; });
  world.generate();
  return world;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const hasPosition = (positions, x, y, z) => positions.some((point) =>
  point[0] === x && point[1] === y && point[2] === z);

test("terrain generation is deterministic and bounds-safe", () => {
  const world = flatWorld({ seed: 7 });
  const data = [...world.getChunk(0, 0).data];
  world.generate();
  assert.deepEqual([...world.getChunk(0, 0).data], data);
  assert.equal(world.getBlock(0, -1, 0), null);
  assert.equal(world.getBlock(0.5, 1, 0), null);
  assert.equal(world.addBlock(0, 8, 0, blocks.stone.id), false);
  assert.equal(world.addBlock(0, -1, 0, blocks.stone.id), false);
  assert.equal(world.addBlock(0, 5, 0, 999), false);
  assert.equal(world.removeBlock(0, 5, 0), false);
  world.clear();
});

test("editing across a chunk seam reveals and hides neighboring blocks", () => {
  const world = flatWorld();
  const chunk = world.getChunk(0, 0);
  assert.equal(hasPosition(chunk.getVisibleBlocks()[blocks.dirt.id], 3, 2, 1), false);
  const revision = chunk.revision;
  assert.equal(world.removeBlock(4, 2, 1), true);
  assert.ok(chunk.revision > revision);
  assert.equal(hasPosition(chunk.getVisibleBlocks()[blocks.dirt.id], 3, 2, 1), true);
  assert.equal(world.addBlock(4, 2, 1, blocks.dirt.id), true);
  assert.equal(hasPosition(chunk.getVisibleBlocks()[blocks.dirt.id], 3, 2, 1), false);
  world.clear();
});

test("negative coordinates, block edits, and resource settings survive save/load", () => {
  const world = flatWorld();
  const storage = memoryStorage();
  assert.equal(world.addBlock(-1, 5, -1, blocks.stone.id), true);
  world.params.resources.stone.scarcity = 0.9;
  const terrainReference = world.params.terrain;
  const resourceReference = world.params.resources.stone.scale;
  assert.equal(world.save(storage), "GAME SAVED");
  world.removeBlock(-1, 5, -1);
  world.params.resources.stone.scarcity = 0.1;
  assert.equal(world.load(storage), "GAME LOADED");
  assert.equal(world.getBlock(-1, 5, -1).id, blocks.stone.id);
  assert.equal(world.params.resources.stone.scarcity, 0.9);
  assert.equal(world.params.terrain, terrainReference);
  assert.equal(world.params.resources.stone.scale, resourceReference);
  world.clear();
});

test("legacy saves load and invalid saves leave the world untouched", () => {
  const world = flatWorld();
  const storage = memoryStorage();
  storage.setItem("mincraft_params", JSON.stringify(world.params));
  storage.setItem("mincraft_data", JSON.stringify({ "0-0-1-5-1": blocks.stone.id }));
  assert.equal(world.load(storage), "GAME LOADED");
  assert.equal(world.getBlock(1, 5, 1).id, blocks.stone.id);
  const snapshot = world.getSnapshot();
  storage.setItem("minecraft_save_v2", JSON.stringify({
    version: 2, params: { terrain: { scale: 0 } }, data: {},
  }));
  assert.equal(world.load(storage), "SAVED GAME IS INVALID");
  assert.equal(world.getSnapshot(), snapshot);
  storage.setItem("minecraft_save_v2", JSON.stringify({
    version: 2, params: world.params, data: { "0-0-4-0-0": 1 },
  }));
  assert.equal(world.load(storage), "SAVED GAME IS INVALID");
  assert.equal(world.getSnapshot(), snapshot);
  assert.equal(world.load(memoryStorage()), "NO SAVED GAME");
  world.clear();
});

test("queued chunks are cancelled on removal and cannot populate a cleared world", () => {
  const jobs = [];
  const world = flatWorld({
    schedule: (callback) => {
      const job = { callback, cancelled: false };
      jobs.push(job);
      return () => { job.cancelled = true; };
    },
  });
  world.asyncLoading = true;
  world.update({ x: 4, y: 7, z: 0 });
  assert.ok(world.pending.size > 0);
  const discarded = [...world.chunks.values()].filter((chunk) => !chunk.loaded);
  world.update({ x: -4, y: 7, z: 0 });
  assert.ok(jobs.some((job) => job.cancelled));
  jobs.filter((job) => job.cancelled).forEach((job) => job.callback());
  assert.ok(discarded.every((chunk) => !chunk.loaded));
  world.clear();
  jobs.forEach((job) => job.callback());
  assert.equal(world.chunks.size, 0);
  assert.equal(world.pending.size, 0);
  assert.deepEqual(world.getSnapshot(), []);
});

test("entering a queued player chunk loads it before physics needs it", () => {
  const world = flatWorld({ schedule: () => () => {} });
  world.asyncLoading = true;
  world.update({ x: 4, y: 7, z: 0 });
  assert.equal(world.getChunk(2, 0).loaded, false);
  world.update({ x: 8, y: 7, z: 0 });
  assert.equal(world.getChunk(2, 0).loaded, true);
  world.clear();
});

test("async loading works when requestIdleCallback is unavailable", async () => {
  const world = flatWorld();
  world.asyncLoading = true;
  world.update({ x: 4, y: 7, z: 0 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(world.pending.size, 0);
  assert.equal(world.getSnapshot().length, 9);
  world.clear();
});

test("changing tree frequency does not change the cloud noise field", () => {
  const world = new World({ chunkSize: { width: 16, height: 20 }, seed: 17 });
  world.center = { x: 0, z: 0 };
  world.drawDistance = 0;
  world.params.trees.frequency = 0;
  Object.assign(world.params.trees.trunk, { minHeight: 1, maxHeight: 1 });
  Object.assign(world.params.trees.canopy, { minRadius: 1, maxRadius: 1 });
  world.generate();
  const cloudMask = () => {
    const mask = [];
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) mask.push(world.getBlock(x, 19, z).id === blocks.cloud.id);
    }
    return mask;
  };
  const before = cloudMask();
  world.params.trees.frequency = 0.1;
  world.generate();
  assert.deepEqual(cloudMask(), before);
  world.clear();
});

test("storage quota errors do not crash a save", () => {
  const world = flatWorld();
  const storage = { setItem: () => { throw new Error("Quota exceeded"); } };
  assert.equal(world.save(storage), "UNABLE TO SAVE GAME");
  world.clear();
});
