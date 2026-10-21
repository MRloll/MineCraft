import { blocksById } from "./blocks.js";

export class DataStore {
  data = Object.create(null);

  clear() {
    this.data = Object.create(null);
  }

  get(chunkX, chunkZ, x, y, z) {
    return this.data[[chunkX, chunkZ, x, y, z].join("-")];
  }

  set(chunkX, chunkZ, x, y, z, blockId) {
    this.data[[chunkX, chunkZ, x, y, z].join("-")] = blockId;
  }

  static parse(value, size) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid saved blocks");
    }
    const data = Object.create(null);
    for (const [key, id] of Object.entries(value)) {
      const match = /^(-?\d+)-(-?\d+)-(\d+)-(\d+)-(\d+)$/.exec(key);
      if (!match || !Number.isInteger(id) || !blocksById[id]) {
        throw new Error("Invalid saved block");
      }
      const [chunkX, chunkZ, x, y, z] = match.slice(1).map(Number);
      if (
        ![chunkX, chunkZ, x, y, z].every(Number.isSafeInteger) ||
        chunkX % size.width !== 0 || chunkZ % size.width !== 0 ||
        x >= size.width || z >= size.width || y >= size.height
      ) {
        throw new Error("Saved block is out of bounds");
      }
      data[key] = id;
    }
    return data;
  }
}
