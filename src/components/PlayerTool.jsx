import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";

const MODEL_PATH = "/models/minecraft_pickaxe.glb";

export default function PlayerTool({ player, visible }) {
  const { scene } = useGLTF(MODEL_PATH);
  const swing = useRef();
  const previousSwing = useRef(player.swingVersion);
  const startTime = useRef(null);

  useFrame(({ clock }) => {
    if (previousSwing.current !== player.swingVersion) {
      previousSwing.current = player.swingVersion;
      startTime.current = clock.elapsedTime;
    }
    const elapsed = startTime.current === null ? 0.4 : clock.elapsedTime - startTime.current;
    swing.current.rotation.z = elapsed < 0.4 ? 0.5 * Math.sin(elapsed / 0.4 * Math.PI * 2) : 0;
  });

  return (
    <group
      visible={visible}
      position={[0.2, -0.2, -0.18]}
      scale={0.01}
      rotation={[0, Math.PI + 1.4, Math.PI / 2]}
      dispose={null}
    >
      <group ref={swing}>
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
