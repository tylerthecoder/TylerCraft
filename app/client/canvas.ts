import { CONFIG } from "../src/config";
import { Vector3D } from "../src/utils/vector";
declare const mat4: any;
// import {mat4} from "gl-matrix";

export class CanvasProgram {
  eCanvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  eHudCanvas = document.getElementById("hudCanvas") as HTMLCanvasElement;
  eHud = document.getElementById("hud") as HTMLCanvasElement;
  gl: WebGLRenderingContext;
  hudCxt: CanvasRenderingContext2D;
  program: {
    program: WebGLProgram,
    attribLocations: { [name: string]: number },
    uniformLocations: { [name: string]: WebGLUniformLocation },
  };

  textures: { [name: string]: WebGLTexture };

  constructor() {
    // init gl eCanvas
    const gl = this.eCanvas.getContext("webgl", {
      // premultipliedAlpha: false,
      // alpha: false,
    });


    // Only continue if WebGL is available and working
    if (gl === null) {
      throw new Error(
        "Unable to initialize WebGL. Your browser or machine may not support it."
      );
    }

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

    this.textures = {
      textureAtlas: this.loadTexture("./img/texture_map.png"),
      checker: this.loadTexture("./img/checker.jpg")
    };

    this.clearCanvas();
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

  //
  // Initialize a texture and load an image.
  // When the image finished loading copy it into the texture.
  //
  loadTexture(url: string): WebGLTexture {
    const gl = this.gl;

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
      throw new Error("Error loading texture file")
    }

    return texture;
  }
}

export const canvas = new CanvasProgram();
