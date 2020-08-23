
interface CubeData {
  gravitable: boolean;
}

export type BLOCK_TYPES = "grass" | "stone" | "wood" | "leaf";


export const BLOCK_DATA: {[id in BLOCK_TYPES]: CubeData} = {
  grass: {
    gravitable: false,
  },
  stone: {
    gravitable: false,
  },
  wood: {
    gravitable: false,
  },
  leaf: {
    gravitable: false,
  }
}

