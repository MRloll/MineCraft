import test from "node:test";
import assert from "node:assert/strict";
import { Player } from "../player.js";
import { Physics } from "../physics.js";

const singleBlock = (block) => ({
  getBlock: (x, y, z) => x === block.x && y === block.y && z === block.z ? { id: 3 } : { id: 0 },
});
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, actual + " != " + expected);

test("opposite movement keys and diagonal speed are handled consistently", () => {
  const player = new Player();
  player.setMovement(new Set(["KeyW", "KeyS"]));
  close(player.input.z, 0);
  player.setMovement(new Set(["KeyS"]));
  close(player.input.z, 1);
  player.setMovement(new Set(["KeyW", "KeyD"]));
  close(player.input.length(), 1);
  player.position.set(0, 0, 0);
  player.yaw = Math.PI / 2;
  player.setMovement(new Set(["KeyW"]));
  player.applyInput(1);
  close(player.position.x, -player.maxSpeed);
  close(player.position.z, 0);
});

test("a floor collision grounds the player and removes downward velocity", () => {
  const player = new Player();
  const physics = new Physics();
  player.position.set(0, 2.25, 0);
  physics.update(0.02, player, singleBlock({ x: 0, y: 0, z: 0 }));
  close(player.position.y, 2.25);
  close(player.velocity.y, 0);
  assert.equal(player.onGround, true);
});

test("a ceiling collision does not enable another jump", () => {
  const player = new Player();
  const physics = new Physics();
  player.position.set(0, 1.55, 0);
  player.velocity.y = 5;
  physics.detectCollisions(player, singleBlock({ x: 0, y: 2, z: 0 }));
  close(player.position.y, 1.5);
  close(player.velocity.y, 0);
  assert.equal(player.onGround, false);
});

test("forward velocity is removed correctly at a wall, including a rotated camera", () => {
  const player = new Player();
  const physics = new Physics();
  player.position.set(0, 1, 0.9);
  player.velocity.set(0, 0, -10);
  physics.detectCollisions(player, singleBlock({ x: 0, y: 0, z: 0 }));
  close(player.position.z, 1);
  close(player.velocity.z, 0);
  player.yaw = Math.PI / 2;
  player.position.set(0.9, 1, 0);
  player.velocity.set(0, 0, -10);
  physics.detectCollisions(player, singleBlock({ x: 0, y: 0, z: 0 }));
  close(player.position.x, 1);
  close(player.velocity.z, 0);
});

test("a player centered inside a block receives a nonzero collision normal", () => {
  const player = new Player();
  const physics = new Physics();
  player.position.set(0, 0.9, 0);
  const block = { x: 0, y: 0, z: 0 };
  const collision = physics.getCollision(block, player);
  assert.ok(collision.overlap > 0);
  close(collision.normal.length(), 1);
  physics.detectCollisions(player, singleBlock(block));
  assert.equal(physics.getCollision(block, player), null);
});

test("a long background frame cannot accumulate seconds of physics work", () => {
  const player = new Player();
  const physics = new Physics();
  physics.update(10, player, { getBlock: () => ({ id: 0 }) });
  assert.ok(player.position.y > 14 && player.position.y < 15);
  assert.ok(physics.accumulator < physics.timestep);
});
