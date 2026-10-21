export const texturePaths = {
  dirt: "/BlocksTexture/dirt.png",
  grass: "/BlocksTexture/grass.png",
  grassSide: "/BlocksTexture/grass_side.png",
  stone: "/BlocksTexture/stone.png",
  coalOre: "/BlocksTexture/coal_ore.png",
  ironOre: "/BlocksTexture/iron_ore.png",
  leaves: "/BlocksTexture/jungle_leaves.png",
  treeSide: "/BlocksTexture/jungle_tree_side.png",
  treeTop: "/BlocksTexture/jungle_tree_top.png",
  sand: "/BlocksTexture/sand.png",
};

// Block definitions contain data only. R3F components own textures and materials.
export const blocks = {
  empty: { id: 0, name: "empty", label: "Pickaxe", icon: "pickaxe.png" },
  grass: {
    id: 1,
    name: "grass",
    label: "Grass",
    icon: "grass.png",
    faces: ["grassSide", "grassSide", "grass", "dirt", "grassSide", "grassSide"],
  },
  dirt: { id: 2, name: "dirt", label: "Dirt", icon: "dirt.png", texture: "dirt" },
  stone: {
    id: 3, name: "stone", label: "Stone", icon: "stone.png", texture: "stone",
    scale: { x: 30, y: 30, z: 30 }, scarcity: 0.5,
  },
  coalOre: {
    id: 4, name: "coalOre", label: "Coal ore", icon: "coal_ore.png", texture: "coalOre",
    scale: { x: 20, y: 20, z: 20 }, scarcity: 0.8,
  },
  ironOre: {
    id: 5, name: "ironOre", label: "Iron ore", icon: "iron_ore.png", texture: "ironOre",
    scale: { x: 15, y: 20, z: 30 }, scarcity: 0.9,
  },
  tree: {
    id: 6, name: "tree", label: "Wood", icon: "jungle_tree_top.png",
    faces: ["treeSide", "treeSide", "treeTop", "treeTop", "treeSide", "treeSide"],
  },
  leaves: {
    id: 7, name: "leaves", label: "Leaves", icon: "jungle_leaves.png",
    texture: "leaves", alphaTest: 0.5, occludes: false,
  },
  sand: { id: 8, name: "sand", label: "Sand", icon: "sand.png", texture: "sand" },
  cloud: { id: 9, name: "cloud", label: "Cloud", color: "#ffffff", unlit: true },
};

export const blockTypes = Object.values(blocks).filter((block) => block.id !== 0);
export const blocksById = Object.fromEntries(Object.values(blocks).map((block) => [block.id, block]));
export const resources = [blocks.stone, blocks.coalOre, blocks.ironOre];
export const toolbarBlocks = [...blockTypes.filter((block) => block.icon), blocks.empty];
