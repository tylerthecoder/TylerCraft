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

console.log("Hello World");

const LOAD_DIST = 6;
const SCALE_FACTOR = 10;

export class TerrainApp {
  private terrainGenerator = new TerrainGenerator(
    this.hasChunk.bind(this),
    this.getChunk.bind(this)
  );
  private eCanvas = document.getElementById(
    "terrainCanvas"
  ) as HTMLCanvasElement;
  private ctx = this.eCanvas.getContext("2d")!;
  private chunks: Map<string, Chunk> = new Map();

  private offsetX = 50;
  private offsetY = 50;

  constructor() {
    // setup canvas
    const getCanvasDimensions = () => {
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
        const chunk = this.terrainGenerator.generateChunk(chunkPos);
        this.chunks.set(chunkPos.toIndex(), chunk);
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
  }

  private drawRectOutline(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) {
    this.ctx.strokeStyle = color;
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

  private draw() {
    console.log("Drawing world");
    for (const [, chunk] of this.chunks.entries()) {
      // draw the chunk
      const worldPos = World.chunkPosToWorldPos(chunk.pos);

      const xPos = (worldPos.data[0] + this.offsetX) * SCALE_FACTOR;
      const yPos = (worldPos.data[2] + this.offsetY) * SCALE_FACTOR;
      const size = CONFIG.terrain.chunkSize * SCALE_FACTOR;

      this.drawRectOutline(xPos, yPos, size, size, "black");

      // get the top block of each pos
      for (let i = 0; i < CONFIG.terrain.chunkSize; i++) {
        for (let j = 0; j < CONFIG.terrain.chunkSize; j++) {
          let blockPos = worldPos.add(new Vector3D([i, 0, j]));

          // Keep moving up until we find the top block
          while (chunk.containsWorldPos(blockPos)) {
            blockPos = blockPos.add(new Vector3D([0, 1, 0]));
          }
          // go down one
          blockPos = blockPos.add(new Vector3D([0, -1, 0]));

          const cube = chunk.getBlockFromWorldPos(blockPos);
          if (!cube) {
            return;
          }

          let color = "red";
          if (cube.type === BLOCKS.grass) {
            color = "green";
          } else if (cube.type === BLOCKS.stone) {
            color = "grey";
          } else if (cube.type === BLOCKS.wood) {
            color = "tan";
          }

          this.drawWorldPosRect(blockPos.stripY(), color);

          // Print the y level
          // this.drawWorldPosText(
          //   blockPos.stripY(),
          //   String(blockPos.data[1]),
          //   "black"
          // );
          this.drawWorldPosText(
            blockPos.stripY(),
            String(
              this.terrainGenerator.biomeGenerator.fringeHeight.get(
                blockPos.stripY().toIndex()
              )
            ),
            "black"
          );
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
  console.log("Loading");
  await WorldModule.load();
  console.log("loaded");
  Random.setSeed("Test 2");
  const app = new TerrainApp();
  console.log(app);
};

load();
