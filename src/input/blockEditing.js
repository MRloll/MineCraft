export function bindBlockEditing({ canvas, controlsRef, player, world, physics }) {
  const handleMouseDown = (event) => {
    if (event.button !== 0 || !controlsRef.current?.isLocked || !player.selectedCoords) return;

    const { x, y, z } = player.selectedCoords;
    if (player.activeBlockId === 0) {
      if (world.removeBlock(x, y, z)) player.swingVersion++;
    } else if (!physics.getCollision({ x, y, z }, player)) {
      world.addBlock(x, y, z, player.activeBlockId);
    }
  };

  // Pointer lock retargets mouse input to the locked element, which may be
  // R3F's event container rather than the canvas. Both bubble to its document.
  const target = canvas.ownerDocument;
  target.addEventListener("mousedown", handleMouseDown);
  return () => target.removeEventListener("mousedown", handleMouseDown);
}
