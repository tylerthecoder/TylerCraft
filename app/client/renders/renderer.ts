import { CanvasProgram, canvas } from "../canvas";
import { Camera } from "../cameras/camera";
import { arrayAdd, arraySub } from "../../src/utils";
declare var mat4: any;

// Main class that defines how to render objects

export abstract class Renderer {

  canvas: CanvasProgram;

  posBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  textureBuffer: WebGLBuffer;

  texture: WebGLTexture;

  amount: number;

  constructor() {
    // this might be a bad practice but it make things so much easier
  }

  protected setBuffers(
    positions: number[],
    indices: number[],
    textureCords: number[]
  ) {
    const gl = canvas.gl;

    this.amount = indices.length;

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

    this.textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCords),
      gl.STATIC_DRAW
    );
  }

  protected setActiveTexture(texture: WebGLTexture) {
    this.texture = texture;
  }

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  private bindCube() {
    const programInfo = canvas.program;
    const gl = canvas.gl;

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

  // tell webgl how to pull out the texture coordinates from buffer
  private bindTexture() {
    const programInfo = canvas.program;
    const gl = canvas.gl;

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

  abstract render(camera: Camera): void;

  renderObject(pos: number[], camera: Camera) {
    const gl = canvas.gl;
    const programInfo = canvas.program;


    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI / 2 - camera.rot[0], [1,0,0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, camera.rot[1], [0, 1, 0]);

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      arraySub(pos, camera.pos.data)
    );

    this.bindCube();

    this.bindTexture();


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

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.drawElements(
      gl.TRIANGLES,
      this.amount,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}
