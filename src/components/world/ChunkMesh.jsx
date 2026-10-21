import { memo, useSyncExternalStore } from "react";
import { DoubleSide } from "three";
import { blockTypes } from "../../game/blocks.js";
import BlockInstances from "./BlockInstances";

const ignoreRaycast = () => {};

function ChunkMesh({ chunk, textures }) {
  useSyncExternalStore(chunk.subscribe, chunk.getSnapshot, chunk.getSnapshot);
  const visible = chunk.getVisibleBlocks();
  const center = (chunk.size.width - 1) / 2;

  return (
    <group position={[chunk.position.x, 0, chunk.position.z]}>
      {blockTypes.map((block) => visible[block.id].length > 0 && (
        <BlockInstances
          key={block.id}
          block={block}
          positions={visible[block.id]}
          textures={textures}
        />
      ))}
      <mesh
        position={[center, chunk.params.terrain.waterOffset + 0.4, center]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={ignoreRaycast}
        receiveShadow
      >
        <planeGeometry args={[chunk.size.width, chunk.size.width]} />
        <meshLambertMaterial
          color="#9090e0"
          transparent
          opacity={0.5}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default memo(ChunkMesh);
