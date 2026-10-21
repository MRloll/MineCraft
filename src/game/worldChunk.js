import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { RNG } from "./rng.js";
import { blocks, blocksById, blockTypes, resources } from "./blocks.js";

const NEIGHBORS = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];

export class WorldChunk {
  loaded = false;
  revision = 0;
  listeners = new Set();
  visibleBlocks = null;

  constructor(size, params, dataStore, x, z, getWorldBlock) {
    this.key = [x, z].join(",");
    this.coords = { x, z };
    this.position = { x: x * size.width, y: 0, z: z * size.width };
    this.size = size;
    this.params = params;
    this.dataStore = dataStore;
    this.getWorldBlock = getWorldBlock;
    this.data = new Uint8Array(size.width * size.height * size.width);
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.revision;

  invalidate() {
    this.visibleBlocks = null;
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }

  index(x, y, z) {
    return (x * this.size.height + y) * this.size.width + z;
  }

  inBounds(x, y, z) {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) &&
      x >= 0 && x < this.size.width && y >= 0 && y < this.size.height &&
      z >= 0 && z < this.size.width;
  }

  getBlock(x, y, z) {
    return this.inBounds(x, y, z) ? { id: this.data[this.index(x, y, z)] } : null;
  }

  setBlockId(x, y, z, id) {
    if (this.inBounds(x, y, z)) this.data[this.index(x, y, z)] = id;
  }

  generate() {
    this.data.fill(blocks.empty.id);
    const rng = new RNG(this.params.seed);
    this.generateResources(rng);
    this.generateTerrain(rng);
    const treeSeed = this.params.seed ^ Math.imul(this.coords.x, 73856093) ^ Math.imul(this.coords.z, 19349663);
    this.generateTrees(new RNG(treeSeed));
    // Clouds need a shared noise field. Tree RNG consumption differs by chunk.
    this.generateClouds(new RNG(this.params.seed ^ 0x12345678));
    this.loadPlayerChanges();
    this.loaded = true;
    this.invalidate();
  }

  generateResources(rng) {
    const simplex = new SimplexNoise(rng);
    for (const resource of resources) {
      const { scale, scarcity } = this.params.resources[resource.name];
      for (let x = 0; x < this.size.width; x++) {
        for (let y = 0; y < this.size.height; y++) {
          for (let z = 0; z < this.size.width; z++) {
            const noise = simplex.noise3d(
              (this.position.x + x) / Math.max(scale.x, 0.1),
              y / Math.max(scale.y, 0.1),
              (this.position.z + z) / Math.max(scale.z, 0.1),
            );
            if (noise > scarcity) this.setBlockId(x, y, z, resource.id);
          }
        }
      }
    }
  }

  generateTerrain(rng) {
    const simplex = new SimplexNoise(rng);
    const { scale, magnitude, offset, waterOffset } = this.params.terrain;
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const noise = simplex.noise(
          (this.position.x + x) / Math.max(scale, 0.1),
          (this.position.z + z) / Math.max(scale, 0.1),
        );
        const height = Math.max(0, Math.min(
          this.size.height - 1, Math.floor(this.size.height * (offset + magnitude * noise)),
        ));
        for (let y = 0; y < this.size.height; y++) {
          if (y > height) this.setBlockId(x, y, z, blocks.empty.id);
          else if (y <= waterOffset) this.setBlockId(x, y, z, blocks.sand.id);
          else if (y === height) this.setBlockId(x, y, z, blocks.grass.id);
          else if (this.getBlock(x, y, z).id === blocks.empty.id) {
            this.setBlockId(x, y, z, blocks.dirt.id);
          }
        }
      }
    }
  }

  generateTrees(rng) {
    const { trunk, canopy, frequency } = this.params.trees;
    const minHeight = Math.min(trunk.minHeight, trunk.maxHeight);
    const maxHeight = Math.max(trunk.minHeight, trunk.maxHeight);
    const minRadius = Math.min(canopy.minRadius, canopy.maxRadius);
    const maxRadius = Math.max(canopy.minRadius, canopy.maxRadius);
    const border = Math.ceil(maxRadius);

    for (let x = border; x < this.size.width - border; x++) {
      for (let z = border; z < this.size.width - border; z++) {
        if (rng.random() >= frequency) continue;
        for (let groundY = 0; groundY < this.size.height; groundY++) {
          if (this.getBlock(x, groundY, z).id !== blocks.grass.id) continue;
          const height = Math.round(minHeight + (maxHeight - minHeight) * rng.random());
          for (let y = groundY + 1; y <= groundY + height; y++) {
            this.setBlockId(x, y, z, blocks.tree.id);
          }
          const radius = Math.round(minRadius + (maxRadius - minRadius) * rng.random());
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dz = -radius; dz <= radius; dz++) {
                const density = rng.random();
                if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
                const y = groundY + height + dy;
                if (this.getBlock(x + dx, y, z + dz)?.id !== blocks.empty.id) continue;
                if (density < canopy.density) this.setBlockId(x + dx, y, z + dz, blocks.leaves.id);
              }
            }
          }
          break;
        }
      }
    }
  }

  generateClouds(rng) {
    const simplex = new SimplexNoise(rng);
    const { scale, density } = this.params.clouds;
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const noise = (simplex.noise(
          (this.position.x + x) / Math.max(scale, 0.1),
          (this.position.z + z) / Math.max(scale, 0.1),
        ) + 1) * 0.5;
        if (noise < density) this.setBlockId(x, this.size.height - 1, z, blocks.cloud.id);
      }
    }
  }

  loadPlayerChanges() {
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const id = this.dataStore.get(this.position.x, this.position.z, x, y, z);
          if (id !== undefined) this.setBlockId(x, y, z, id);
        }
      }
    }
  }

  getVisibleBlocks() {
    if (this.visibleBlocks) return this.visibleBlocks;
    const visible = Object.fromEntries(blockTypes.map((block) => [block.id, []]));
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const id = this.data[this.index(x, y, z)];
          if (id !== blocks.empty.id && !this.isBlockObscured(x, y, z)) {
            visible[id].push([x, y, z]);
          }
        }
      }
    }
    this.visibleBlocks = visible;
    return visible;
  }

  isBlockObscured(x, y, z) {
    return NEIGHBORS.every(([dx, dy, dz]) => {
      const neighbor = this.getBlock(x + dx, y + dy, z + dz) ??
        this.getWorldBlock(this.position.x + x + dx, y + dy, this.position.z + z + dz);
      return neighbor && neighbor.id !== blocks.empty.id && blocksById[neighbor.id].occludes !== false;
    });
  }
}
