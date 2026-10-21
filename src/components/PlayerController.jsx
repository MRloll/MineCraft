import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler } from "three";
import usePlayerInput from "../hooks/usePlayerInput";
import { bindBlockEditing } from "../input/blockEditing.js";

export default function PlayerController({
  camera, controlsRef, mode, player, world, physics,
  onSelectBlock, onStatusChange, onPositionChange, onDebugRequest,
}) {
  const gl = useThree((state) => state.gl);
  const yaw = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);
  const labelTimer = useRef(0);
  const lastLabel = useRef("");
  const isPlaying = mode === "playing";

  usePlayerInput({ player, world, controlsRef, mode, onSelectBlock, onStatusChange, onDebugRequest });

  useEffect(() => {
    if (!isPlaying) {
      physics.reset();
      player.selectedCoords = null;
    }
  }, [isPlaying, physics, player]);

  useEffect(() => bindBlockEditing({
    canvas: gl.domElement, controlsRef, player, world, physics,
  }), [controlsRef, gl, physics, player, world]);

  useFrame((_, delta) => {
    if (!camera) return;
    if (isPlaying) {
      player.yaw = yaw.setFromQuaternion(camera.quaternion, "YXZ").y;
      world.update(player.position);
      physics.update(delta, player, world);
      if (player.position.y < -32) {
        player.reset();
        physics.reset();
        world.update(player.position);
      }
    }
    camera.position.copy(player.position);
    camera.updateMatrixWorld();

    labelTimer.current += delta;
    if (labelTimer.current >= 0.1) {
      labelTimer.current = 0;
      const label = player.toString();
      if (label !== lastLabel.current) {
        lastLabel.current = label;
        onPositionChange(label);
      }
    }
  }, -2);
  return null;
}
