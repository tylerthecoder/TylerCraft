import {
  BIOME_SIZE,
  BLOCKS,
  Chunk,
  CONFIG,
  Random,
  TerrainGenerator,
  Vector2D,
  Vector3D,
  World,
  WorldModule,
} from "@craft/engine";
import * as TerrainGen from "@craft/terrain-gen";

const LOAD_DIST = 5;
const SCALE_FACTOR = 8;

export class TerrainApp {
  private terrainGenerator = new TerrainGenerator(
    this.hasChunk.bind(this),
    this.getChunk.bind(this)
  );
  private eCanvas = document.getElementById(
    "terrainCanvas"
  ) as HTMLCanvasElement;

  private ctx = this.eCanvas.getContext("2d") as CanvasRenderingContext2D;
  private chunks: Map<string, Chunk> = new Map();

  private offsetX = 50;
  private offsetY = 50;

  constructor() {
    // setup canvas
    const getCanvasDimensions = () => {
      console.log("getting canvas dimensions");
      this.eCanvas.height = window.innerHeight;
      this.eCanvas.width = window.innerWidth;
      this.draw();
    };
    window.addEventListener("resize", getCanvasDimensions.bind(this));

    console.log(this.chunks);

    this.loadChunks();

    console.log(this.terrainGenerator);

    getCanvasDimensions();
  }

  private loadChunks() {
    console.log("Loading Chunks");
    for (let i = -LOAD_DIST; i < LOAD_DIST; i++) {
      for (let j = -LOAD_DIST; j < LOAD_DIST; j++) {
        const chunkPos = new Vector2D([i, j]);

        const genChunk = new Chunk(TerrainGen.get_chunk_wasm(i, j), chunkPos);

        // const chunk = this.terrainGenerator.generateChunk(chunkPos);
        //
        this.chunks.set(chunkPos.toIndex(), genChunk);
      }
    }
  }

  private hasChunk(chunkPos: Vector2D): boolean {
    return this.chunks.has(chunkPos.toIndex());
  }

  private getChunk(chunkPos: Vector2D): Chunk | undefined {
    return this.chunks.get(chunkPos.toIndex());
  }

  private drawRect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeStyle = "white";
    this.ctx.strokeRect(x, y, w, h);
  }

  private drawRectOutline(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(x, y, w, h);
  }

  private drawText(text: string, x: number, y: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  private drawWorldPosRect(worldPos: Vector2D, color: string) {
    const xPos = (worldPos.data[0] + this.offsetX) * SCALE_FACTOR;
    const yPos = (worldPos.data[1] + this.offsetY) * SCALE_FACTOR;
    const w = SCALE_FACTOR;
    const h = SCALE_FACTOR;

    this.drawRect(xPos, yPos, w, h, color);
  }

  private drawWorldPosText(worldPos: Vector2D, text: string, color: string) {
    const xPos = (worldPos.data[0] + this.offsetX) * SCALE_FACTOR;
    const yPos = (worldPos.data[1] + this.offsetY) * SCALE_FACTOR;
    this.drawText(text, xPos, yPos + SCALE_FACTOR, color);
  }

  private yLvl = 0;
  public increaseYLvl() {
    this.yLvl++;
    this.draw();
  }

  public decreaseYLvl() {
    if (this.yLvl === 0) {
      return;
    }
    this.yLvl--;
    this.draw();
  }

  public moveUp() {
    this.offsetY += SCALE_FACTOR;
    this.draw();
  }

  public moveDown() {
    this.offsetY -= SCALE_FACTOR;
    this.draw();
  }

  public moveLeft() {
    this.offsetX += SCALE_FACTOR;
    this.draw();
  }

  public moveRight() {
    this.offsetX -= SCALE_FACTOR;
    this.draw();
  }

  private draw() {
    console.log(
      "Drawing world Y level: ",
      this.yLvl,
      "offset-x: ",
      this.offsetX,
      "offset-y: ",
      this.offsetY
    );
    // clear the screen
    this.ctx.clearRect(0, 0, this.eCanvas.width, this.eCanvas.height);

    for (const [, chunk] of this.chunks.entries()) {
      const worldPos = World.chunkPosToWorldPos(chunk.pos);

      const xPos = (worldPos.data[0] + this.offsetX) * SCALE_FACTOR;
      const yPos = (worldPos.data[2] + this.offsetY) * SCALE_FACTOR;
      const size = CONFIG.terrain.chunkSize * SCALE_FACTOR;

      this.drawRectOutline(xPos, yPos, size, size, "black");

      for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
        for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
          const blockPos = worldPos.add(new Vector3D([i, this.yLvl, j]));

          let cube = chunk.getBlockFromWorldPos(blockPos);

          if (!cube) {
            // clear cube so we can see the background
            this.drawWorldPosRect(blockPos.stripY(), "white");
            return;
          }

          // loop down until we find a block
          for (let k = this.yLvl - 1; k >= 0; k--) {
            if (cube.block_type !== BLOCKS.void) break;
            cube = chunk.getBlockFromWorldPos(new Vector3D([i, k, j]));
          }

          let color = "red";
          if (cube.block_type === BLOCKS.grass) {
            color = "green";
          } else if (cube.block_type === BLOCKS.stone) {
            color = "grey";
          } else if (cube.block_type === BLOCKS.wood) {
            color = "brown";
          }

          this.drawWorldPosRect(blockPos.stripY(), color);
        }
      }
    }

    // Color the biomes
    Array.from(this.terrainGenerator.biomeGenerator.biomeGrid.values()).forEach(
      (biomeSection) => {
        if (!biomeSection.hasBiome) return;

        this.drawWorldPosRect(biomeSection.biomeWorldPos, "blue");
      }
    );

    // Draw the biome sections
    this.terrainGenerator.biomeGenerator.biomeGrid.forEach((section) => {
      const xPos =
        (section.sectionPos.data[0] * BIOME_SIZE + this.offsetX) * SCALE_FACTOR;
      const yPos =
        (section.sectionPos.data[1] * BIOME_SIZE + this.offsetY) * SCALE_FACTOR;
      const size = SCALE_FACTOR * BIOME_SIZE;

      this.drawRectOutline(xPos, yPos, size, size, "white");
    });

    // this.terrainGenerator.biomeGenerator.fringeBlocks.forEach(blockPos => {
    //   const posVec = Vector2D.fromIndex(blockPos);
    //   this.drawWorldPosRect(posVec, "yellow");
    //   const fringeNum = this.terrainGenerator.biomeGenerator.fringeHeight.get(blockPos);
    //   this.drawWorldPosText(
    //     posVec,
    //     String(fringeNum),
    //     "black",
    //   )
    // });
  }
}

const load = async () => {
  console.log("Loading. Config: ", CONFIG);
  await WorldModule.load();
  console.log("loaded");
  Random.setSeed("Test 2");
  const app = new TerrainApp();
  console.log("Terrain app", app);

  // bind functions to keys
  window.onkeydown = (e) => {
    if (e.key === "ArrowUp") {
      app.increaseYLvl();
    } else if (e.key === "ArrowDown") {
      app.decreaseYLvl();
    } else if (e.key === "j") {
      app.moveDown();
    } else if (e.key === "k") {
      app.moveUp();
    } else if (e.key === "h") {
      app.moveLeft();
    } else if (e.key === "l") {
      app.moveRight();
    }
  };
};

load();
