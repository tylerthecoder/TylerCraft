class Space {
  constructor() {
    this.gl = this.getCanvas();
    this.clearCanvas();
  }

  async render() {
    const programInfo = await this.getProgram(this.gl);

    let then = 0;

    const cubes = [
      new Cube([1, 1, -9]),
      new Cube([-2, -2, -20])
    ];


    const render = (now) => {
      this.clearCanvas();
      now *= 0.001; // convert to seconds
      const delta = now - then;
      then = now;


      for (const cube of cubes) {
        cube.draw(this.gl, programInfo, delta);
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  clearCanvas() {
    // Set clear color to black, fully opaque
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.clearDepth(1.0); // Clear everything
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  getCanvas() {
    const canvas = document.querySelector("#glCanvas");
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    console.log(canvas);
    // Initialize the GL context
    const gl = canvas.getContext("webgl");

    // Only continue if WebGL is available and working
    if (gl === null) {
      throw new Error("Unable to initialize WebGL. Your browser or machine may not support it.");
    }

    return gl;
  }

  async getProgram(gl) {
    const vsSource = await fetch("../vertex_shader.glsl").then(x => x.text());
    const fsSource = await fetch("../fragment_shader.glsl").then(x => x.text());

    const shaderProgram = this.initShaderProgram(gl, vsSource, fsSource);

    return {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      },
    };
  }

  //
  // Initialize a shader program, so WebGL knows how to draw our data
  //
  initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  }

  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  loadShader(gl, type, source) {
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
}