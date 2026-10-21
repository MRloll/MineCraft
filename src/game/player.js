import { Vector3 } from "three";
import { PLAYER_SPAWN } from "./settings.js";

const UP = new Vector3(0, 1, 0);

export class Player {
  radius = 0.5;
  height = 1.75;
  jumpSpeed = 10;
  maxSpeed = 10;
  yaw = 0;
  onGround = false;
  activeBlockId = 0;
  selectedCoords = null;
  swingVersion = 0;
  position = new Vector3(...PLAYER_SPAWN);
  input = new Vector3();
  velocity = new Vector3();
  worldVelocityBuffer = new Vector3();
  velocityAdjustment = new Vector3();

  get worldVelocity() {
    return this.worldVelocityBuffer.copy(this.velocity).applyAxisAngle(UP, this.yaw);
  }

  setMovement(keys) {
    this.input.set(
      Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
      0,
      Number(keys.has("KeyS")) - Number(keys.has("KeyW")),
    );
    if (this.input.lengthSq() > 1) this.input.normalize();
  }

  applyInput(dt) {
    this.velocity.x = this.input.x * this.maxSpeed;
    this.velocity.z = this.input.z * this.maxSpeed;
    this.position.addScaledVector(this.worldVelocity, dt);
  }

  applyWorldDeltaVelocity(delta) {
    this.velocityAdjustment.copy(delta).applyAxisAngle(UP, -this.yaw);
    this.velocity.add(this.velocityAdjustment);
  }

  reset() {
    this.position.fromArray(PLAYER_SPAWN);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
  }

  toString() {
    return ["X: " + this.position.x.toFixed(3), "Y: " + this.position.y.toFixed(3),
      "Z: " + this.position.z.toFixed(3)].join("  ");
  }
}
