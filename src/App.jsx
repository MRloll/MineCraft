import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { PCFShadowMap } from "three";
import GameScene from "./components/GameScene";
import GameHud from "./components/GameHud";
import useStatusMessage from "./hooks/useStatusMessage";

const ORBIT_CAMERA = { position: [-20, 20, -20], fov: 75, near: 0.1, far: 1000 };
const SHADOWS = { type: PCFShadowMap };

export default function App() {
  const [activeBlockId, setActiveBlockId] = useState(0);
  const [position, setPosition] = useState("");
  const [mode, setMode] = useState("paused");
  const [status, showStatus] = useStatusMessage();

  return (
    <main className="game">
      <Canvas shadows={SHADOWS} dpr={[1, 2]} camera={ORBIT_CAMERA} gl={{ antialias: true }}>
        <GameScene
          activeBlockId={activeBlockId}
          mode={mode}
          onModeChange={setMode}
          onActiveBlockChange={setActiveBlockId}
          onPositionChange={setPosition}
          onStatusChange={showStatus}
        />
        <Stats />
      </Canvas>
      <GameHud
        activeBlockId={activeBlockId}
        onSelectBlock={setActiveBlockId}
        mode={mode}
        position={position}
        status={status}
      />
    </main>
  );
}
