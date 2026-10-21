import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function SceneLighting({ player }) {
  const sun = useRef();
  const target = useRef();

  useLayoutEffect(() => {
    sun.current.target = target.current;
  }, []);

  useFrame(() => {
    sun.current.position.set(player.position.x + 50, player.position.y + 50, player.position.z + 50);
    target.current.position.copy(player.position);
    target.current.updateMatrixWorld();
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <object3D ref={target} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-bias={0.00001}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-bottom={-100}
        shadow-camera-top={50}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
      />
    </>
  );
}
