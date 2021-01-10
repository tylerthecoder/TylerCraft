import { CanvasProgram, canvas } from "../canvas";
import { Camera } from "../../src/camera";
import { arraySub } from "../../src/utils";
// import {mat4} from "gl-matrix";
declare const mat4: any;

export abstract class Renderer {

  canvas: CanvasProgram;

  posBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  textureBuffer: WebGLBuffer;
  transPosBuffer: WebGLBuffer;
  transIndexBuffer: WebGLBuffer;
  transTextureBuffer: WebGLBuffer;

  texture: WebGLTexture;
  amount: number;
  transAmount: number;

  protected setBuffers(
    positions: number[],
    indices: number[],
    textureCords: number[],
    transPositions?: number[],
    transIndices?: number[],
    transTextureCords?: number[],
  ) {
    const gl = canvas.gl;

    this.amount = indices.length;

    this.posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    this.textureBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCords), gl.STATIC_DRAW);

    if (transPositions) {
      this.transPosBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.transPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transPositions), gl.STATIC_DRAW);
    }

    if (transIndices) {
      this.transIndexBuffer = gl.createBuffer()!;
      this.transAmount = transIndices.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.transIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(transIndices), gl.STATIC_DRAW);
    }

    if (transTextureCords) {
      this.transTextureBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.transTextureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transTextureCords), gl.STATIC_DRAW);
    }

  }

  protected setActiveTexture(texture: WebGLTexture) {
    this.texture = texture;
  }

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  private bindCube(trans: boolean) {
    const programInfo = canvas.program;
    const gl = canvas.gl;

    const posBuffer = trans ? this.transPosBuffer : this.posBuffer;
    const indexBuffer = trans ? this.transIndexBuffer : this.indexBuffer;

    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
  }

  // tell webgl how to pull out the texture coordinates from buffer
  private bindTexture(trans: boolean) {
    const programInfo = canvas.program;
    const gl = canvas.gl;

    const textureBuffer = trans ? this.transTextureBuffer : this.textureBuffer;

    const num = 2; // every coordinate composed of 2 values
    const type = gl.FLOAT; // the data in the buffer is 32 bit float
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set to the next
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCord,
      num,
      type,
      normalize,
      stride,
      offset
    );
  }

  abstract render(camera: Camera): void;

  renderObject(pos: number[], camera: Camera, trans?: boolean) {
    const gl = canvas.gl;
    const programInfo = canvas.program;

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
    mat4.rotate(modelViewMatrix, modelViewMatrix, camera.rot.get(2) - Math.PI / 2, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, camera.rot.get(1) - Math.PI / 2, [0, 1, 0]);

    // Now move the drawing position to where we want to start drawing the square.
    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      new Float32Array(arraySub(pos, camera.pos.data))
    );

    this.bindCube(trans || false);
    this.bindTexture(trans || false);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.drawElements(
      gl.TRIANGLES,
      trans ? this.transAmount : this.amount,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}
