import { CONFIG } from "../src/constants";

export class CanvasProgram {
  canvas: HTMLCanvasElement;
  hudCanvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  hudCxt: CanvasRenderingContext2D;
  program: any;

  textures: { [name: string]: WebGLTexture };

  constructor() {
    this.gl = this.getCanvas();

    this.setup();

    this.textures = {
      player: this.loadTexture("./img/player.png"),
      textureAtlas: this.loadTexture("./img/texture_map.png"),
      checker: this.loadTexture("./img/checker.jpg")
    };

    this.clearCanvas();
  }

  setup() {
    const gl = this.gl;

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
  }

  clearCanvas() {
    this.gl.clearColor(0.0, 0.8, 1.0, 1.0);
    this.gl.clearDepth(1.0); // Clear everything
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  getCanvas() {
    // init hud canvas
    this.hudCanvas = document.querySelector("#hudCanvas");
    this.hudCanvas.height = window.innerHeight;
    this.hudCanvas.width = window.innerWidth;
    this.hudCxt = this.hudCanvas.getContext("2d");

    // init gl canvas
    this.canvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
    this.canvas.height = window.innerHeight;
    this.canvas.width = window.innerWidth;
    const gl = this.canvas.getContext("webgl", {
      // premultipliedAlpha: false,
      // alpha: false,
    });



    // Only continue if WebGL is available and working
    if (gl === null) {
      throw new Error(
        "Unable to initialize WebGL. Your browser or machine may not support it."
      );
    }

    return gl;
  }

  async loadProgram() {
    const vsSource = await fetch("./shaders/vertex.glsl").then(x => x.text());
    const fsSource = await fetch("./shaders/fragment.glsl").then(x => x.text());

    const shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource);

    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(
          shaderProgram,
          "aVertexPosition"
        ),
        textureCoord: this.gl.getAttribLocation(shaderProgram, "aTextureCoord")
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(
          shaderProgram,
          "uProjectionMatrix"
        ),
        modelViewMatrix: this.gl.getUniformLocation(
          shaderProgram,
          "uModelViewMatrix"
        ),
        uSampler: this.gl.getUniformLocation(shaderProgram, "uSampler")
      }
    };
    this.gl.useProgram(this.program.program);
  }

  //
  // Initialize a shader program, so WebGL knows how to draw our data
  //
  initShaderProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
  ) {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }

    return shaderProgram;
  }

  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  loadShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  //
  // Initialize a texture and load an image.
  // When the image finished loading copy it into the texture.
  //
  loadTexture(url: string) {
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
    image.onload = function() {
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

    return texture;
  }
}

export const canvas = new CanvasProgram();
