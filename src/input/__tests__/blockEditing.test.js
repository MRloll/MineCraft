import test from "node:test";
import assert from "node:assert/strict";
import { bindBlockEditing } from "../blockEditing.js";
import { World } from "../../game/world.js";
import { Player } from "../../game/player.js";
import { Physics } from "../../game/physics.js";
import { blocks } from "../../game/blocks.js";

function fixture() {
  const world = new World({ chunkSize: { width: 4, height: 8 } });
  world.center = { x: 0, z: 0 };
  world.drawDistance = 0;
  Object.assign(world.params.terrain, { magnitude: 0, offset: 0.5, waterOffset: 0 });
  world.params.trees.frequency = 0;
  world.params.clouds.density = 0;
  world.generate();

  const player = new Player();
  player.position.set(1, 6.25, 3);
  player.activeBlockId = blocks.stone.id;
  player.selectedCoords = { x: 1, y: 5, z: 1 };
  const controlsRef = { current: { isLocked: true } };
  const ownerDocument = new EventTarget();
  const canvas = new EventTarget();
  canvas.ownerDocument = ownerDocument;
  const unbind = bindBlockEditing({
    canvas, controlsRef, player, world, physics: new Physics(),
  });
  const click = (button = 0) => {
    const event = new Event("mousedown");
    Object.defineProperty(event, "button", { value: button });
    ownerDocument.dispatchEvent(event);
  };
  return { world, player, controlsRef, canvas, unbind, click };
}

test("a locked left click reaching the document places the selected block above ground", () => {
  const { world, canvas, click, unbind } = fixture();
  let canvasClicks = 0;
  canvas.addEventListener("mousedown", () => canvasClicks++);
  const chunk = world.getChunk(0, 0);
  const revision = chunk.revision;

  click();

  assert.equal(canvasClicks, 0, "pointer-lock input need not target the canvas");
  assert.equal(world.getBlock(1, 5, 1).id, blocks.stone.id);
  assert.ok(chunk.revision > revision);
  assert.ok(chunk.getVisibleBlocks()[blocks.stone.id].some(
    ([x, y, z]) => x === 1 && y === 5 && z === 1,
  ));
  unbind();
  world.clear();
});

test("right clicks, unlocked clicks, and missing targets do not edit blocks", () => {
  const { world, player, controlsRef, click, unbind } = fixture();
  click(2);
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  controlsRef.current.isLocked = false;
  click();
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  controlsRef.current.isLocked = true;
  player.selectedCoords = null;
  click();
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  unbind();
  world.clear();
});

test("pickaxe clicks remove a block and animate only a successful edit", () => {
  const { world, player, click, unbind } = fixture();
  click();
  player.activeBlockId = blocks.empty.id;
  click();
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  assert.equal(player.swingVersion, 1);
  click();
  assert.equal(player.swingVersion, 1);
  unbind();
  world.clear();
});

test("placement cannot intersect the player and the listener is removed on cleanup", () => {
  const { world, player, click, unbind } = fixture();
  player.position.set(1, 6.25, 1);
  click();
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  player.position.set(1, 6.25, 3);
  unbind();
  click();
  assert.equal(world.getBlock(1, 5, 1).id, 0);
  world.clear();
});
