import { Vector3 } from "three";
import { blocks } from "./blocks.js";

export class Physics {
  timestep = 1 / 200;
  accumulator = 0;
  gravity = 32;
  candidates = [];
  contacts = [];

  reset() {
    this.accumulator = 0;
    this.candidates = [];
    this.contacts = [];
  }

  update(delta, player, world) {
    if (!Number.isFinite(delta)) return;
    this.accumulator += Math.min(Math.max(delta, 0), 0.1);
    while (this.accumulator >= this.timestep) {
      player.velocity.y -= this.gravity * this.timestep;
      player.applyInput(this.timestep);
      this.detectCollisions(player, world);
      this.accumulator -= this.timestep;
    }
  }

  detectCollisions(player, world) {
    player.onGround = false;
    this.candidates = this.broadPhase(player, world);
    this.contacts = this.candidates
      .map((block) => this.getCollision(block, player))
      .filter(Boolean)
      .sort((a, b) => a.overlap - b.overlap);

    for (const contact of this.contacts) {
      // Earlier contacts can move the cylinder, so recompute each overlap.
      const collision = this.getCollision(contact.block, player);
      if (!collision) continue;
      const { normal, overlap } = collision;
      if (normal.y > 0 && player.velocity.y <= 0) player.onGround = true;
      player.position.addScaledVector(normal, overlap);
      const intoSurface = player.worldVelocity.dot(normal);
      if (intoSurface < 0) {
        player.applyWorldDeltaVelocity(normal.clone().multiplyScalar(-intoSurface));
      }
    }
  }

  broadPhase(player, world) {
    const candidates = [];
    for (let x = Math.floor(player.position.x - player.radius); x <= Math.ceil(player.position.x + player.radius); x++) {
      for (let y = Math.floor(player.position.y - player.height); y <= Math.ceil(player.position.y); y++) {
        for (let z = Math.floor(player.position.z - player.radius); z <= Math.ceil(player.position.z + player.radius); z++) {
          const block = world.getBlock(x, y, z);
          if (block && block.id !== blocks.empty.id) candidates.push({ x, y, z });
        }
      }
    }
    return candidates;
  }

  getCollision(block, player) {
    const p = player.position;
    const bottom = p.y - player.height;
    const upOverlap = block.y + 0.5 - bottom;
    const downOverlap = p.y - (block.y - 0.5);
    if (upOverlap <= 0 || downOverlap <= 0) return null;

    const closestX = Math.max(block.x - 0.5, Math.min(p.x, block.x + 0.5));
    const closestZ = Math.max(block.z - 0.5, Math.min(p.z, block.z + 0.5));
    const dx = p.x - closestX;
    const dz = p.z - closestZ;
    const distance = Math.hypot(dx, dz);
    if (distance >= player.radius) return null;

    let horizontalNormal;
    let horizontalOverlap;
    if (distance > 0) {
      horizontalNormal = new Vector3(dx / distance, 0, dz / distance);
      horizontalOverlap = player.radius - distance;
    } else {
      // The cylinder center is inside the box: choose an actual face rather
      // than normalizing a zero vector, which would leave the player stuck.
      const faces = [
        { overlap: p.x - (block.x - 0.5) + player.radius, normal: new Vector3(-1, 0, 0) },
        { overlap: block.x + 0.5 - p.x + player.radius, normal: new Vector3(1, 0, 0) },
        { overlap: p.z - (block.z - 0.5) + player.radius, normal: new Vector3(0, 0, -1) },
        { overlap: block.z + 0.5 - p.z + player.radius, normal: new Vector3(0, 0, 1) },
      ].sort((a, b) => a.overlap - b.overlap);
      horizontalNormal = faces[0].normal;
      horizontalOverlap = faces[0].overlap;
    }

    const verticalOverlap = Math.min(upOverlap, downOverlap);
    const vertical = verticalOverlap < horizontalOverlap;
    return {
      block,
      normal: vertical ? new Vector3(0, upOverlap < downOverlap ? 1 : -1, 0) : horizontalNormal,
      overlap: vertical ? verticalOverlap : horizontalOverlap,
      point: {
        x: closestX,
        y: Math.max(block.y - 0.5, Math.min(p.y - player.height / 2, block.y + 0.5)),
        z: closestZ,
      },
    };
  }
}
