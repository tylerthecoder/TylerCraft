declare var mat4: any;

enum IFace {
  FRONT = 0,
  BACK = 1,
  TOP = 2,
  BOTTOM = 3,
  RIGHT = 4,
  LEFT = 5
}

class CubeForm {
  program: any;
  gl: WebGLRenderingContext;

  posBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  textureBuffer: WebGLBuffer;

  faces: any;

  constructor(
    public canvas: CanvasProgram,
    public textures: WebGLTexture[],
    public size: IDim
  ) {
    this.program = canvas.program;
    this.gl = canvas.gl;

    this.initPositionBuffer();
    this.initTextureBuffer();
  }

  getFace(i: number, dir: number, size: number[]) {
    const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const pos = square
      .map(edge => {
        edge.splice(i, 0, dir);
        return edge.map((dim, i) => dim * size[i]);
      })
      .flat();
    return pos;
  }

  initPositionBuffer() {
    // this might be controlled by a higher class. one
    // that knows the surround blocks and such
    const facesToRender = [0, 1, 2, 3, 4, 5];

    const size = this.size;

    const base = [0, 1, 2, 0, 2, 3];

    this.faces = [];
    const positions = [];
    const indices = [];
    let count = 0;
    for (const face of facesToRender) {
      const i = face >> 1;
      const dir = face % 2 === 0 ? 1 : -1;

      const pos = this.getFace(i, dir, size);
      const index = base.map(x => x + count);
      count += 4;

      positions.push(...pos);
      indices.push(...index);

      this.faces.push({
        pos,
        index,
        texture: this.textures[face]
      });
    }

    const gl = this.gl;

    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );
  }

  initTextureBuffer() {
    const gl = this.gl;
    this.textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);

    const textureCoordinates = [
      // Front
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      // Back
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      // Top
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      // Bottom
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      // Right
      1.0,
      1.0,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      // Left
      1.0,
      1.0,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0
    ];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW
    );
  }

  bindCube() {
    const programInfo = this.program;
    const gl = this.gl;

    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  render(pos: number[], screenPos: number[], screenRot: number[]) {
    const gl = this.gl;
    const programInfo = this.program;

    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI / 2 - screenRot[0], [
      1,
      0,
      0
    ]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, screenRot[1], [0, 1, 0]);

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      pos.map((ele, index) => (ele - screenPos[index]) * 2)
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    this.bindCube();

    // tell webgl how to pull out the texture coordinates from buffer
    {
      const num = 2; // every coordinate composed of 2 values
      const type = gl.FLOAT; // the data in the buffer is 32 bit float
      const normalize = false; // don't normalize
      const stride = 0; // how many bytes to get from one set to the next
      const offset = 0; // how many bytes inside the buffer to start from
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
      gl.vertexAttribPointer(
        programInfo.attribLocations.textureCoord,
        num,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    {
      const type = gl.UNSIGNED_SHORT;

      let count = 0;
      for (const face of this.faces) {
        gl.bindTexture(gl.TEXTURE_2D, face.texture);
        gl.drawElements(gl.TRIANGLES, 6, type, count);
        count += 12;
      }
    }
  }
}
