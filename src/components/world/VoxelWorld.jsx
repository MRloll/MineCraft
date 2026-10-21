import { useSyncExternalStore } from "react";
import { useTexture } from "@react-three/drei";
import { NearestFilter, SRGBColorSpace } from "three";
import { texturePaths } from "../../game/blocks.js";
import ChunkMesh from "./ChunkMesh";

function configureTextures(textures) {
  textures.forEach((texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
  });
}

export default function VoxelWorld({ world, rootRef }) {
  const chunks = useSyncExternalStore(world.subscribe, world.getSnapshot, world.getSnapshot);
  const textures = useTexture(texturePaths, configureTextures);

  return (
    <group ref={rootRef}>
      {chunks.map((chunk) => (
        <ChunkMesh key={chunk.key} chunk={chunk} textures={textures} />
      ))}
    </group>
  );
}
