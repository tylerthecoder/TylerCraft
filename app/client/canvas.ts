import { CONFIG } from "../src/config";
import { Vector3D } from "../src/utils/vector";
import TextureService from "./services/textureService";
declare const mat4: any;
import type { Navigator, XRSession, XRFrame, XRWebGLLayer, XRReferenceSpace } from 'webxr';

const WebGlLayer = (window as any).XRWebGLLayer as typeof XRWebGLLayer;

export class CanvasProgram {
  eCanvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  eHudCanvas = document.getElementById("hudCanvas") as HTMLCanvasElement;
  eHud = document.getElementById("hud") as HTMLCanvasElement;
  eWebxrButton = document.getElementById("webxrButton") as HTMLCanvasElement;
  gl: WebGLRenderingContext;
  hudCxt: CanvasRenderingContext2D;
  program: {
    program: WebGLProgram,
    attribLocations: { [name: string]: number },
    uniformLocations: { [name: string]: WebGLUniformLocation },
  };

  navigator = (window.navigator as any as Navigator);
  webXrSession: XRSession | null = null;
  xrRefSpace: XRReferenceSpace | null = null;
  currentXRFrame: XRFrame | null = null;

  constructor() {
    // init gl eCanvas
    const gl = this.eCanvas.getContext("webgl2", {
      // premultipliedAlpha: false,
      // alpha: false,
    });
    if (gl === null) throw new Error("WebGL failed to load"); // Only continue if WebGL is available and working

    TextureService.load(gl);
    this.gl = gl;

    const getCanvasDimensions = () => {
      this.eHudCanvas.height = window.innerHeight;
      this.eHudCanvas.width = window.innerWidth;
      this.eCanvas.height = window.innerHeight;
      this.eCanvas.width = window.innerWidth;
      this.gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      if (this.program) this.createProjectionMatrix();
    }

    window.addEventListener("resize", getCanvasDimensions);
    getCanvasDimensions();

    this.hudCxt = this.eHudCanvas.getContext("2d")!;

    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.activeTexture(gl.TEXTURE0); // Tell WebGL we want to affect texture unit 0
    // for transparent images
    if (CONFIG.transparency) {
      // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      // gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      this.gl.enable(this.gl.BLEND);
    }

    this.clearCanvas();
  }

  public createAndBindArrayBuffer() {
    const arrayBuffer = this.gl.createBuffer();
  }


  private createProjectionMatrix() {
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the eCanvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = CONFIG.glFov;
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

    const supported = await this.navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      console.log("Immersive VR not supported");
      return;
    }

    this.webXrSession = await this.navigator.xr.requestSession("immersive-vr", {
      requiredFeatures: ["local-floor"],
    });

    console.log("XR session", this.webXrSession);
    this.webXrSession.addEventListener("end", () => {
      this.eWebxrButton.style.display = "none";
    });

    this.webXrSession.addEventListener("inputsourceschange", () => {
      console.log("inputsourceschange");
    });

    this.webXrSession.updateRenderState({ baseLayer: new WebGlLayer(this.webXrSession, this.gl), depthFar: 1000, depthNear: 0.1 });
    this.xrRefSpace = await this.webXrSession.requestReferenceSpace("local-floor");
    console.log("Ref space", this.xrRefSpace);


  }

  loop(loopFunc: (delta: number) => void) {
    const wrappedXRLoopFunc = (t: number, frame: XRFrame) => {
      this.clearCanvas()
      this.currentXRFrame = frame;
      loopFunc(t);
      this.webXrSession?.requestAnimationFrame(wrappedXRLoopFunc);
    }
    const wrappedLoopFunc = (t: number) => {
      this.clearCanvas()
      loopFunc(t);
      window.requestAnimationFrame(wrappedLoopFunc);
    }

    if (this.webXrSession) {
      console.log("xr loop")
      this.webXrSession.requestAnimationFrame(wrappedXRLoopFunc);
    } else {
      console.log("Normal loop")
      window.requestAnimationFrame(wrappedLoopFunc);
    }
  }


  clearCanvas() {
    this.gl.clearColor(0.0, 0.8, 1.0, 1.0);
    this.gl.clearDepth(1.0); // Clear everything
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  setColorFilter(color: Vector3D) {
    this.gl.uniform4f(this.program.uniformLocations.uFilter, color.get(0), color.get(1), color.get(2), 0);
  }

  async loadProgram() {
    const gl = this.gl;

    const vsSource = await fetch("./shaders/vertex.glsl").then(x => x.text());
    const fsSource = await fetch("./shaders/fragment.glsl").then(x => x.text());

    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();

    if (!shaderProgram) {
      throw new Error("Error loading shader program")
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log(
        "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(shaderProgram)
      );
      throw new Error("Unable to init shader program")
    }

    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCord: gl.getAttribLocation(shaderProgram, "aTextureCord"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix")!,
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix")!,
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler")!,
        uFilter: gl.getUniformLocation(shaderProgram, "uFilter")!,
      }
    };

    gl.useProgram(this.program.program);

    gl.enableVertexAttribArray(this.program.attribLocations.vertexPosition);
    gl.enableVertexAttribArray(this.program.attribLocations.textureCord);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.program.uniformLocations.uSampler, 0);

    // set the color filter
    this.setColorFilter(new Vector3D([0, 0, 0]));
    this.createProjectionMatrix();

    await this.initWebXR();
  }

  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error("Error loading shader")
    }

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error("Error loading shader")
    }

    return shader;
  }
}

export const canvas = new CanvasProgram();
