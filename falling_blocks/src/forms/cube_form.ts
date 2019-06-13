declare var mat4: any;

class CubeForm {
  texture: any;
  program: any;
  gl: WebGLRenderingContext;
  size: IDim;

  posBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;

  constructor(canvas: CanvasProgram, texture: any, size: IDim) {
    this.texture = texture;
    this.program = canvas.program;
    this.gl = canvas.gl;
    this.size = size;

    this.posBuffer = this.initPositionBuffer();
    this.indexBuffer = this.initIndexBuffer();
  }

  getFace(i: number, dir: number, size: number[]) {
    const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const pos = square
      .map(edge => {
        edge.splice(i, 0, dir);
        return edge.map((dim, i) => dim * size[i]);
      })
      .flat();
    return {
      pos,
      indices: [0, 1, 2, 0, 2, 3]
    };
  }

  initPositionBuffer() {
    const gl = this.gl;

    const positionBuffer = gl.createBuffer();

    const size = this.size;

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
      ...this.getFace(2, 1, size).pos, // Front
      ...this.getFace(2, -1, size).pos, // Back
      ...this.getFace(1, 1, size).pos, // Top
      ...this.getFace(1, -1, size).pos, // Bottom
      ...this.getFace(0, 1, size).pos, // Right
      ...this.getFace(0, -1, size).pos //Left
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
  }

  initIndexBuffer() {
    const gl = this.gl;
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const base = [0, 1, 2, 0, 2, 3];

    const indices = [
      ...base, //front
      ...base.map(x => x + 4), //back
      ...base.map(x => x + 8), //top
      ...base.map(x => x + 12), //bottom
      ...base.map(x => x + 16), //right
      ...base.map(x => x + 20) //left
    ];

    // Now send the element array to GL

    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return indexBuffer;
  }

  initTextureBuffer(gl: WebGLRenderingContext) {
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
      // Front
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      // Back
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
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
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      // Left
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0
    ];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW
    );

    return textureCoordBuffer;
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

  render(
    size: number[],
    pos: number[],
    rot: number,
    screenPos: number[],
    screenRot: number[]
  ) {
    const gl = this.gl;
    const programInfo = this.program;

    const buffers = {
      textureCoord: this.initTextureBuffer(gl)
    };
    pos = pos.map((ele, index) => ele - screenPos[index]);

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
      pos
    ); // amount to translate

    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      rot, // amount to rotate in radians
      [0, 0, 1]
    ); // axis to rotate around

    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      pos
    ); // amount to translate

    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      rot * 0.7, // amount to rotate in radians
      [0, 1, 0]
    ); // axis to rotate around

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
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
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

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // set texture parameters
    // gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Prevents s-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // Prevents t-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

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
      const vertexCount = 36;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }
}
