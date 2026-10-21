import { toolbarBlocks } from "../game/blocks.js";

export default function GameHud({ activeBlockId, onSelectBlock, mode, position, status }) {
  return (
    <>
      <div className="info">{position}</div>
      {mode === "playing" && <div className="crosshair" aria-hidden="true">+</div>}
      {mode === "debug" && <div className="debug-hint">Debug camera · Enter to play</div>}
      <div className="toolbar-container">
        <div className="toolbar" role="toolbar" aria-label="Block selection">
          {toolbarBlocks.map((block) => (
            <button
              key={block.id}
              type="button"
              className={"toolbar-slot" + (activeBlockId === block.id ? " selected" : "")}
              aria-label={block.id + ": " + block.label}
              aria-pressed={activeBlockId === block.id}
              title={block.id + ": " + block.label}
              onClick={() => onSelectBlock(block.id)}
            >
              <img className="toolbar-icon" src={"/BlocksTexture/" + block.icon} alt="" />
            </button>
          ))}
        </div>
      </div>

      <div className="overlay" hidden={mode !== "paused"}>
        <div className="instructions">
          <h1>MINECRAFTjs</h1>
          <p>W A S D — Move · SPACE — Jump</p>
          <p>R — Reset position · 0 — Pickaxe</p>
          <p>1–8 — Select block · Click — Mine / place</p>
          <p>F2 — Save · F4 — Load</p>
          <p>F10 — Debug camera · ESC — Pause</p>
          <button className="start-game" type="button">CLICK OR PRESS ENTER TO PLAY</button>
        </div>
      </div>
      {status && <div className="status" role="status">{status}</div>}
    </>
  );
}
