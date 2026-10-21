import { useEffect, useRef } from "react";

const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const isEditing = (target) => target instanceof Element && (
  target.closest("button, input, select, textarea, [contenteditable='true']") ||
  target.closest(".lil-gui")
);

export default function usePlayerInput({
  player, world, controlsRef, mode, onSelectBlock, onStatusChange, onDebugRequest,
}) {
  const keys = useRef(new Set());
  const currentMode = useRef(mode);
  currentMode.current = mode;

  useEffect(() => {
    if (mode === "playing") return;
    keys.current.clear();
    player.setMovement(keys.current);
    player.velocity.x = 0;
    player.velocity.z = 0;
  }, [mode, player]);

  useEffect(() => {
    const resetMovement = () => {
      keys.current.clear();
      player.setMovement(keys.current);
    };
    const handleKeyDown = (event) => {
      if (isEditing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      const playing = currentMode.current === "playing";

      if (event.code === "F2" || event.code === "F4") {
        event.preventDefault();
        if (!event.repeat) onStatusChange(event.code === "F2" ? world.save() : world.load());
        return;
      }
      if (event.code === "F10") {
        event.preventDefault();
        if (!event.repeat) onDebugRequest();
        return;
      }
      if (/^Digit[0-8]$/.test(event.code)) {
        const id = Number(event.code.slice(-1));
        player.activeBlockId = id;
        onSelectBlock(id);
        return;
      }
      if (event.code === "Escape") return;

      const canStart = event.code === "Enter" ||
        (currentMode.current === "paused" && (movementKeys.has(event.code) || event.code === "Space"));
      if (!playing && canStart && !event.repeat) controlsRef.current?.lock();

      if (movementKeys.has(event.code) && (playing || currentMode.current === "paused")) {
        event.preventDefault();
        keys.current.add(event.code);
        player.setMovement(keys.current);
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (playing && !event.repeat && player.onGround) {
          player.velocity.y = player.jumpSpeed;
          player.onGround = false;
        }
      }
      if (event.code === "KeyR" && !event.repeat) {
        player.reset();
        world.update(player.position);
      }
    };
    const handleKeyUp = (event) => {
      keys.current.delete(event.code);
      player.setMovement(keys.current);
    };
    const handleBlur = () => {
      resetMovement();
      controlsRef.current?.unlock();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      resetMovement();
    };
  }, [controlsRef, onDebugRequest, onSelectBlock, onStatusChange, player, world]);
}
