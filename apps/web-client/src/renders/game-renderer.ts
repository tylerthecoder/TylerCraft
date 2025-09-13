import {
  Camera,
  GameWrapper,
  makeCameraForPlayer,
  makeThirdPersonBackCamera,
  makeThirdPersonFrontCamera,
  makeXRCamera,
  Vector2D,
  Vector3D,
} from "@craft/engine";
import { Renderer } from "./renderer";
import { ChunkRenderer } from "./chunkRender";
import {
  add_script_to_registry,
  BlockType,
  Entity,
  Fireball,
  Player,
} from "@craft/rust-world";
import { PlayerRenderer } from "./playerRender";
import { SphereRenderer } from "./sphereRender";
import type {
  Navigator,
  XRSession,
  XRFrame,
  XRReferenceSpace,
  XRWebGLLayer,
} from "webxr";
import { mat4 } from "gl-matrix";
import VertexShader from "../../shaders/vertex.glsl?raw";
import FragmentShader from "../../shaders/fragment.glsl?raw";
import { getEle, getEleOrError } from "../utils";

const WebGlLayer = (window as any).XRWebGLLayer as typeof XRWebGLLayer;

type Config = {
  renderDistance: number;
  fovFactor: number;
  glFov: number;
  transparency: boolean;
};

export enum PlayerPerspective {
  FirstPerson,
  ThirdPersonBack,
  ThirdPersonFront,
}

const CHUNK_SIZE = 16;

const DEFAULT_CONFIG: Config = {
  renderDistance: 5,
  fovFactor: 0.5,
  glFov: (45 * Math.PI) / 180,
  transparency: true,
};

export class GameRendererGameScript {
  public static name = "World Renderer";
  public static defaultConfig = DEFAULT_CONFIG;
  updatedChunks: Set<number> = new Set();
  updatedEntities: Set<number> = new Set();

  constructor(public config: Config = DEFAULT_CONFIG) {}

  static register() {
    add_script_to_registry(GameRendererGameScript);
  }

  // This is called by the rust side when a chunk is updated
  onChunkUpdate(chunkId: number): void {
    console.log("CanvasGameScript: onChunkUpdate", chunkId);
    this.updatedChunks.add(chunkId);
  }

  // This is called by the rust side when an entity is updated
  onEntityUpdate(entityId: number): void {
    console.log("CanvasGameScript: onEntityUpdate", entityId);
    this.updatedEntities.add(entityId);
  }

  // This is called by the rust side
  getConfig(): Config {
    return this.config;
  }

  // This is called by the rust side
  setConfig(config: Config): void {
    this.config = { ...this.config, ...config };
    console.log("CanvasGameScript config updated:", this.config);
  }
}

GameRendererGameScript.register();

export class GameRenderer {
  private renderers: Renderer[] = [];
  private entityRenderers: Map<number, Renderer> = new Map();
  private chunkRenderers: Map<number, ChunkRenderer> = new Map();
  public perspective: PlayerPerspective = PlayerPerspective.FirstPerson;

  public eCanvas = getEleOrError<HTMLCanvasElement>("glCanvas");
  public eWebxrButton = getEle<HTMLCanvasElement>("webxrButton");
  public gl: WebGLRenderingContext;
  public program: {
    program: WebGLProgram;
    attribLocations: { [name: string]: number };
    uniformLocations: { [name: string]: WebGLUniformLocation };
  };
  public navigator = window.navigator as any as Navigator;
  public webXrSession: XRSession | null = null;
  public xrRefSpace: XRReferenceSpace | null = null;
  public currentXRFrame: XRFrame | null = null;
  public textureAtlas: WebGLTexture;
  private galleryImagesPaths: string[] = ["./img/tree.jpg"];
  private galleryImages: WebGLTexture[] = [];

  public shouldRenderMainPlayer = false;

  public isSpectating = false;
  public totTime = 0;
  public pastDeltas: number[] = [];

  private getGameScript(): GameRendererGameScript {
    return this.game.game.getScriptState(
      GameRendererGameScript.name
    ) as GameRendererGameScript;
  }

  private getConfig(): Config {
    const gameScript = this.getGameScript();
    return gameScript.getConfig();
  }

  constructor(private game: GameWrapper, private mainPlayerId: number) {
    this.eCanvas.style.display = "block";

    // init gl eCanvas
    const gl = this.eCanvas.getContext("webgl2", {
      // premultipliedAlpha: false,
      // alpha: false,
    });
    if (gl === null) throw new Error("WebGL failed to load"); // Only continue if WebGL is available and working

    this.textureAtlas = this.loadTextureFromUrl("/img/texture_map.png", gl);

    this.galleryImagesPaths.forEach((path) => {
      const img = new Image();
      img.src = path;
      const texture = this.loadTextureFromUrl(path, gl);
      this.galleryImages.push(texture);
    });

    this.gl = gl;

    const getCanvasDimensions = () => {
      this.eCanvas.height = window.innerHeight;
      this.eCanvas.width = window.innerWidth;
      this.gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      if (this.program) this.createProjectionMatrix();
    };

    window.addEventListener("resize", getCanvasDimensions);
    getCanvasDimensions();

    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.activeTexture(gl.TEXTURE0); // Tell WebGL we want to affect texture unit 0
    // for transparent images
    if (this.getConfig().transparency) {
      // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      // gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );

      this.gl.enable(this.gl.BLEND);
    }

    this.clearCanvas();

    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, VertexShader);
    const fragmentShader = this.loadShader(
      gl,
      gl.FRAGMENT_SHADER,
      FragmentShader
    );

    const shaderProgram = gl.createProgram();

    if (!shaderProgram) {
      throw new Error("Error loading shader program");
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      throw new Error("Unable to init shader program");
    }

    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCord: gl.getAttribLocation(shaderProgram, "aTextureCord"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(
          shaderProgram,
          "uProjectionMatrix"
        )!,
        modelViewMatrix: gl.getUniformLocation(
          shaderProgram,
          "uModelViewMatrix"
        )!,
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler")!,
        uFilter: gl.getUniformLocation(shaderProgram, "uFilter")!,
      },
    };

    gl.useProgram(this.program.program);

    gl.enableVertexAttribArray(this.program.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(this.program.attribLocations.textureCord);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.program.uniformLocations.uSampler, 0);

    // set the color filter
    this.setColorFilter(new Vector3D([0, 0, 0]));
    this.createProjectionMatrix();

    this.initWebXR().then(() => {
      console.log("WebXR initialized");
    });
    console.log("Canvas Render Usecase", this);

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e.key);
    });

    // Create renderers for initial entities
    for (const entity of this.game.game.entities.get_all_clone()) {
      this.onNewEntity(entity);
    }

    // Create renderers for initial chunks
    for (const chunkId of this.game.getLoadedChunkIds()) {
      this.createChunkRender(chunkId);
    }

    this.isSpectating = false;
  }

  getCamera(): Camera {
    const player = this.game.getPlayer(this.mainPlayerId);
    if (this.isXr) {
      return makeXRCamera(player);
    } else {
      if (this.perspective === PlayerPerspective.FirstPerson) {
        return makeCameraForPlayer(player);
      } else if (this.perspective === PlayerPerspective.ThirdPersonBack) {
        return makeThirdPersonBackCamera(player);
      } else {
        return makeThirdPersonFrontCamera(player);
      }
    }
  }

  update() {
    for (const entityId of this.getGameScript().updatedEntities) {
      console.log("CanvasGameScript: Updating entity", entityId);
      const entity = this.game.game.entities.get_entity_by_id_clone(entityId);
      if (!entity) {
        console.log("CanvasGameScript: Entity not found", entityId);
        this.onRemovedEntity(entityId);
        continue;
      }
      this.onNewEntity(entity);
    }

    for (const chunkId of this.getGameScript().updatedChunks) {
      this.createChunkRender(chunkId);
    }

    const gameScript = this.getGameScript();

    gameScript.updatedChunks.clear();
    gameScript.updatedEntities.clear();

    this.game.game.setScriptState(GameRendererGameScript.name, gameScript);
  }

  getFilter(camera: Camera): Vector3D {
    const shiftedDown = camera.pos.sub(new Vector3D([0, 0.5, 0]));
    const block = this.game.getBlock(shiftedDown);

    if (block?.type === BlockType.Water) {
      return new Vector3D([0, 0.3, 1]);
    } else {
      return Vector3D.zero;
    }
  }

  setup(): void | Promise<void> {
    this.loop(this.renderLoop.bind(this));
  }

  private handleKeyDown(key: string) {
    if (key === "v") {
      this.togglePerspective();
    }
  }

  public togglePerspective(): boolean {
    this.perspective =
      this.perspective === PlayerPerspective.FirstPerson
        ? PlayerPerspective.ThirdPersonBack
        : this.perspective === PlayerPerspective.ThirdPersonBack
        ? PlayerPerspective.ThirdPersonFront
        : PlayerPerspective.FirstPerson;

    return this.perspective !== PlayerPerspective.FirstPerson;
  }

  get frameRate() {
    this.pastDeltas = this.pastDeltas.slice(-100);
    const totTime = this.pastDeltas.reduce((acc, cur) => acc + cur, 0);
    const averageMs = totTime / Math.min(this.pastDeltas.length, 100);
    const fps = 1 / (averageMs / 1000);
    return fps;
  }

  renderLoop(time: number) {
    const delta = time - this.totTime;

    const camera = this.getCamera();

    const shouldRenderMainPlayer =
      this.perspective !== PlayerPerspective.FirstPerson;

    const filter = this.getFilter(camera);
    if (filter) {
      this.setColorFilter(filter);
    }

    const renderedChunks = new Set<ChunkRenderer>();
    // this will hold the coords of ever chunk that was rendered.
    const renderedSet = new Set<string>();

    for (const renderer of this.renderers) {
      renderer.render(camera);
    }

    for (const entityRenderer of this.entityRenderers.values()) {
      // Skip rendering the player if we aren't supposed to
      if (
        entityRenderer instanceof PlayerRenderer &&
        entityRenderer.entityId === this.mainPlayerId &&
        !shouldRenderMainPlayer
      ) {
        continue;
      }
      entityRenderer.render(camera);
    }

    // loop through all of the chunks that I would be able to see.
    const cameraXYPos = new Vector2D([camera.pos.get(0), camera.pos.get(2)]);

    const realRenderDistance = CHUNK_SIZE * this.getConfig().renderDistance;
    const cameraChunkPos = this.game.getChunkPosFromWorldPos(camera.pos);

    // const cameraRotNorm = camera.rot.toCartesianCoords().normalize();

    const renderChunk = (chunkPos: Vector2D) => {
      const chunkId = this.game.getChunkIdFromChunkPos(chunkPos);
      const chunkRenderer = this.chunkRenderers.get(chunkId);
      if (!chunkRenderer) {
        return;
      }
      renderedChunks.add(chunkRenderer);
      chunkRenderer.render(camera);
    };

    const skippedChunkPos = new Set<Vector2D>();

    for (
      let i = -this.getConfig().renderDistance;
      i <= this.getConfig().renderDistance;
      i++
    ) {
      for (
        let j = -this.getConfig().renderDistance;
        j <= this.getConfig().renderDistance;
        j++
      ) {
        const indexVec = new Vector2D([i, j]);
        const chunkPos = cameraChunkPos.add(indexVec);
        const chunkWorldPos = this.game.getWorldPosFromChunkPos(chunkPos);
        const chunkXYPos = new Vector2D([
          chunkWorldPos.get(0),
          chunkWorldPos.get(2),
        ]);
        const distAway = cameraXYPos.distFrom(chunkXYPos);

        if (distAway > realRenderDistance) {
          // don't render this chunk because it is outside of the player's view
          continue;
        }

        // DISABLED: idk if this actually works
        // check if you are facing that right way to see the chunk
        // const diffChunkCamera = camera.pos.sub(chunkWorldPos).normalize();
        // const dist = diffChunkCamera.distFrom(cameraRotNorm);

        // if (dist > this.config.fovFactor) {
        //   // don't render this chunk because the player isn't looking at it
        //   skippedChunkPos.add(chunkPos);
        //   continue;
        // }

        renderedSet.add(chunkPos.toIndex());

        renderChunk(chunkPos);
      }
    }

    for (const chunkPos of skippedChunkPos.values()) {
      // check to see if any of the neighboring chunks were rendered
      // this is slightly inefficient but it makes sure the user sees all chunks.
      // since we are checking to see if the user can see the middle of the chunk we miss some chunks
      // that the user sees the edge of. This fixes that
      let stillShouldntRender = true;
      for (let k = -1; k <= 1; k += 1) {
        for (let l = -1; l <= 1; l += 1) {
          const indexVec = new Vector2D([k, l]);
          const chunkPosToCheck = chunkPos.add(indexVec);
          if (renderedSet.has(chunkPosToCheck.toIndex())) {
            stillShouldntRender = false;
          }
        }
      }

      if (!stillShouldntRender) {
        renderChunk(chunkPos);
      }
    }

    // This is for when you are looking directly at the ground.
    // Since I only check when the user can't see the center of a chunk, if you are looking directly at the ground you can't
    // see the chunk. Thus this renders the 9 chunks below you.
    for (let k = -1; k <= 1; k += 1) {
      for (let l = -1; l <= 1; l += 1) {
        const indexVec = new Vector2D([k, l]);
        const chunkPos = cameraChunkPos.add(indexVec);
        if (!renderedSet.has(chunkPos.toIndex())) renderChunk(chunkPos);
      }
    }

    // loop through all the chunk renders and only render the transparent things
    // This is last so that the transparent things are rendered on top of the solid things
    for (const chunkRenderer of renderedChunks.values()) {
      chunkRenderer.render(camera, true);
    }

    this.pastDeltas.push(delta);
    this.totTime = time;
  }

  onNewEntity(entity: Entity): void {
    console.log("CanvasGameScript: Adding entity", entity);
    // if (entity instanceof PlayerWrapper) {
    if (Player.is_player(entity)) {
      console.log("CanvasGameScript: Adding player");
      const renderer = new PlayerRenderer(this.game.game, this, entity.id);
      this.entityRenderers.set(entity.id, renderer);
    } else if (Fireball.is_fireball(entity)) {
      console.log("CanvasGameScript: Adding fireball");
      const renderer = new SphereRenderer(this.game.game, this, entity.id);
      this.entityRenderers.set(entity.id, renderer);
    }
  }

  onRemovedEntity(entityId: number): void {
    console.log("CanvasGameScript: Removing entity", entityId);
    this.entityRenderers.delete(entityId);
  }

  createChunkRender(chunkId: number): void {
    console.log("CanvasGameScript: Creating chunk render", chunkId);
    const chunkPos = this.game.getChunkPosFromChunkId(chunkId);
    const chunkMesh = this.game.getChunkMeshFromChunkPos(chunkId);
    const chunkRenderer = new ChunkRenderer(this, chunkPos, chunkMesh);
    chunkRenderer.getBufferData();
    this.chunkRenderers.set(chunkId, chunkRenderer);
  }

  public loadTextureFromUrl(url: string, gl: WebGLRenderingContext) {
    const isPowerOf2 = (x: number) => (x & (x - 1)) === 0;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    const image = new Image();
    image.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        // No, it's not a power of 2. Turn off mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
    };
    image.src = url;

    if (!texture) {
      throw new Error("Error loading texture file");
    }

    return texture;
  }

  // Returns one of the images that I have loaded locally on my
  getGalleryTexture(index: number): WebGLTexture {
    // Make sure we never get an image out of bounds
    index = index % this.galleryImagesPaths.length;

    return this.galleryImages[index];
  }

  private createProjectionMatrix() {
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the eCanvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = this.getConfig().glFov;
    const eCanvasElement = this.gl.canvas as HTMLCanvasElement;
    const aspect = eCanvasElement.clientWidth / eCanvasElement.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    this.gl.uniformMatrix4fv(
      this.program.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
  }

  get isXr() {
    return this.webXrSession !== null;
  }

  private async initWebXR() {
    if (!this.navigator.xr) {
      console.log("WebXR not supported");
      return;
    }

    const supported = await this.navigator.xr.isSessionSupported(
      "immersive-vr"
    );
    if (!supported) {
      console.log("Immersive VR not supported");
      return;
    }

    this.webXrSession = await this.navigator.xr.requestSession("immersive-vr", {
      requiredFeatures: ["local-floor"],
    });

    console.log("XR session", this.webXrSession);
    this.webXrSession.addEventListener("end", () => {
      this.eWebxrButton!.style.display = "none";
    });

    this.webXrSession.addEventListener("inputsourceschange", () => {
      console.log("inputsourceschange");
    });

    this.webXrSession.updateRenderState({
      baseLayer: new WebGlLayer(this.webXrSession, this.gl),
      depthFar: 1000,
      depthNear: 0.1,
    });
    this.xrRefSpace = await this.webXrSession.requestReferenceSpace(
      "local-floor"
    );
    console.log("Ref space", this.xrRefSpace);
  }

  loop(loopFunc: (delta: number) => void) {
    const wrappedXRLoopFunc = (t: number, frame: XRFrame) => {
      this.clearCanvas();
      this.currentXRFrame = frame;
      loopFunc(t);
      this.webXrSession?.requestAnimationFrame(wrappedXRLoopFunc);
    };
    const wrappedLoopFunc = (t: number) => {
      this.clearCanvas();
      loopFunc(t);
      window.requestAnimationFrame(wrappedLoopFunc);
    };

    if (this.webXrSession) {
      console.log("xr loop");
      this.webXrSession.requestAnimationFrame(wrappedXRLoopFunc);
    } else {
      console.log("Normal loop");
      window.requestAnimationFrame(wrappedLoopFunc);
    }
  }

  clearCanvas() {
    this.gl.clearColor(0.0, 0.8, 1.0, 1.0);
    this.gl.clearDepth(1.0); // Clear everything
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  setColorFilter(color: Vector3D) {
    this.gl.uniform4f(
      this.program.uniformLocations.uFilter,
      color.get(0),
      color.get(1),
      color.get(2),
      0
    );
  }

  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  loadShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error("Error loading shader");
    }

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error("Error loading shader");
    }

    return shader;
  }
}
