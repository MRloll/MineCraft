import { useLayoutEffect, useMemo, useRef } from "react";
import { Matrix4 } from "three";

function BlockMaterial({ block, textures }) {
  if (block.unlit) return <meshBasicMaterial color={block.color} />;
  if (block.faces) {
    return block.faces.map((texture, index) => (
      <meshLambertMaterial
        key={index}
        attach={"material-" + index}
        map={textures[texture]}
      />
    ));
  }
  return <meshLambertMaterial map={textures[block.texture]} alphaTest={block.alphaTest ?? 0} />;
}

export default function BlockInstances({ block, positions, textures }) {
  const mesh = useRef();
  const matrix = useMemo(() => new Matrix4(), []);
  // Grow in powers of two rather than reserving an entire chunk for every material.
  const capacity = 2 ** Math.ceil(Math.log2(Math.max(1, positions.length)));
  const args = useMemo(() => [undefined, undefined, capacity], [capacity]);

  useLayoutEffect(() => {
    const instances = mesh.current;
    instances.count = positions.length;
    positions.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      instances.setMatrixAt(index, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingBox();
    instances.computeBoundingSphere();
  }, [capacity, matrix, positions]);

  return (
    <instancedMesh
      ref={mesh}
      args={args}
      count={positions.length}
      userData={{ isVoxel: true, blockId: block.id }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <BlockMaterial block={block} textures={textures} />
    </instancedMesh>
  );
}
