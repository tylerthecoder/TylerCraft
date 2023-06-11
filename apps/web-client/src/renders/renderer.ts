import { canvas } from "../canvas";
import { Camera, arraySub, IDim } from "@craft/engine";
import { mat4, vec3 } from "gl-matrix";

interface IRenderData {
  positions: number[];
  indices: number[];
  textureCords: number[];
}

export class RenderData implements IRenderData {
  positions: number[] = [];
  indices: number[] = [];
  textureCords: number[] = [];

  indexOffset = 0;

  constructor(
    private shouldLog = false,
  ) { }

  public pushData(renData: Partial<RenderData>) {
    if (this.shouldLog) {
      // console.log(renData);
    }
    this.indices.push(...renData.indices ?? []);
    this.positions.push(...renData.positions ?? []);
    this.textureCords.push(...renData.textureCords ?? []);
  }


  public get posOffset() {
    return this.positions.length;
  }

  public clear() {
    this.positions = [];
    this.indices = [];
    this.textureCords = [];
    this.indexOffset = 0;
  }


}

export abstract class Renderer {

  posBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  textureBuffer: WebGLBuffer | null = null;
  transPosBuffer: WebGLBuffer | null = null;
  transIndexBuffer: WebGLBuffer | null = null;
  transTextureBuffer: WebGLBuffer | null = null;

  texture: WebGLTexture | null = null;
  amount = 0;
  transAmount = 0

  protected setBuffers(
    renData: IRenderData,
    transRenData?: IRenderData,
  ) {
    const gl = canvas.gl;

    this.amount = renData.indices.length;

    this.posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(renData.positions), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(renData.indices), gl.STATIC_DRAW);

    this.textureBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(renData.textureCords), gl.STATIC_DRAW);

    if (transRenData?.positions) {
      this.transPosBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.transPosBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transRenData.positions), gl.STATIC_DRAW);
    }

    if (transRenData?.indices) {
      this.transIndexBuffer = gl.createBuffer()!;
      this.transAmount = transRenData.indices.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.transIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(transRenData.indices), gl.STATIC_DRAW);
    }

    if (transRenData?.textureCords) {
      this.transTextureBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.transTextureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(transRenData.textureCords), gl.STATIC_DRAW);
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


  renderXrObject(pos: number[], camera: Camera, trans?: boolean) {
    const { currentXRFrame, xrRefSpace, gl, program, webXrSession } = canvas;
    if (!currentXRFrame || !xrRefSpace || !webXrSession) {
      return;
    }
    const pose = currentXRFrame.getViewerPose(xrRefSpace);
    const glLayer = webXrSession.renderState.baseLayer; // get the WebGL layer (it contains some important information we need)
    if (!pose || !glLayer) {
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer); // sets the framebuffer (drawing target of WebGL) to be our WebXR display's framebuffer

    for (const view of pose.views) {
      const { projectionMatrix } = view;

      // console.log("Number of views", pose.views.length, "Projection matrix", projectionMatrix);

      const viewport = glLayer.getViewport(view); // we get the viewport of our view (the place on the screen where things will be drawn)
      gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height); // we set our viewport appropriately

      // Set the drawing position to the "identity" point, which is
      // the center of the scene.
      const modelViewMatrix = mat4.create();

      // Apply camera rotation
      mat4.multiply(
        modelViewMatrix,
        modelViewMatrix,
        view.transform.inverse.matrix as mat4
      )

      // Now move the drawing position to where we want to start drawing the square.
      mat4.translate(
        modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        new Float32Array(arraySub(pos, camera.pos.data)) as vec3
      );

      gl.uniformMatrix4fv(
        program.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
      );

      gl.uniformMatrix4fv(
        program.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
      );

      this.bindCube(trans || false);
      this.bindTexture(trans || false);

      gl.bindTexture(gl.TEXTURE_2D, this.texture);

      gl.drawElements(
        gl.TRIANGLES,
        trans ? this.transAmount : this.amount,
        gl.UNSIGNED_SHORT,
        0
      );
    }
  }


  renderObject(pos: IDim, camera: Camera, trans?: boolean) {
    if (canvas.currentXRFrame) {
      return this.renderXrObject(pos, camera, trans);
    }
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
      new Float32Array(arraySub(pos, camera.pos.data)) as vec3
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
