import { Player } from "../../src/entities/player";
import { Camera } from "../../src/camera";
import TextureMapper from "../textureMapper";
import { Renderer } from "./renderer";
import { canvas } from "../canvas";
import { Vector3D } from "../../src/utils/vector";


export class PlayerRenderer extends Renderer {

  constructor(public player: Player) {
    super();
    this.setActiveTexture(canvas.textures.textureAtlas);
  }

  render(camera: Camera) {
    this.calculateBuffers();
    this.renderObject(this.player.pos.data, camera);
  }

  private drawBox(edgeFunction: (edge: Vector3D) => Vector3D, positions: number[], indices: number[], count: number) {
    const base = [0, 1, 2, 0, 2, 3];
    const facesToRender = [0, 1, 2, 3, 4, 5];
    for (const face of facesToRender) {
      const i = face >> 1;
      const dir = face % 2 === 0 ? 1 : 0;

      // const pos = this.getFace(i, dir, this.dim);
      const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const pos = square
        .map(edge => {
          // make the 2D square vector 3D
          edge.splice(i, 0, dir);
          return edgeFunction(new Vector3D(edge)).data;
        })
        .flat();

      const index = base.map(x => x + count);
      count += 4;

      positions.push(...pos);
      indices.push(...index);
    }

    return count;
  }


  private armRot = 0;

  private calculateBuffers() {
    const textureCords = [
      ...TextureMapper.getPlayerTextureCoords(),
      ...TextureMapper.getPlayerTextureCoords(),
    ];

    // this.armRot += .01;

    const positions: number[] = [];
    const indices: number[] = [];
    let count = 0;

    const theta = this.player.rot.get(1);
    const phi = -this.player.rot.get(2) + Math.PI / 2;

    const playerDimVec = new Vector3D(this.player.dim);
    const armSize = new Vector3D([.3, .8, .3]);
    const bodySize = new Vector3D([.4, .8, .8]);
    const headSize = new Vector3D([.6, .6, .6]);
    const legSize = new Vector3D([.4, .7, .4]);

    const halfPlayerSize = playerDimVec.scalarMultiply(.5);
    const bodyOrigin = bodySize.scalarMultiply(.5);
    const halfHeadSize = headSize.scalarMultiply(0.5);
    const armOrigin = armSize.multiply([.5, 1, .5]);
    const legOrigin = legSize.multiply([.5, 1, .5]);

    const headPos = halfPlayerSize.add([0, .9, 0]);
    const bodyPos = halfPlayerSize.add([0, .2, 0]);
    const leftArmPos = halfPlayerSize.add(new Vector3D([0, .6, .55]).rotateY(theta));
    const rightArmPos = halfPlayerSize.add(new Vector3D([0, .6, -.55]).rotateY(theta));
    const rightLegPos = halfPlayerSize.add(new Vector3D([0, -.2, 0.2]).rotateY(theta));
    const leftLegPos = halfPlayerSize.add(new Vector3D([0, -.2, -0.2]).rotateY(theta));

    const rightArmRot = Math.sin(this.player.distanceMoved);
    const leftArmRot = Math.sin(this.player.distanceMoved + Math.PI);
    const rightLegRot = Math.sin(this.player.distanceMoved);
    const leftLegRot = Math.sin(this.player.distanceMoved + Math.PI);

    // draw head
    count = this.drawBox(edge => {
      return edge
        .multiply(headSize)
        .sub(halfHeadSize)
        .rotateZ(-phi)
        .rotateY(theta + rightLegRot)
        .add(headPos)
    }, positions, indices, count);

    // draw body
    count = this.drawBox(edge => {
      return edge
        .multiply(bodySize)
        .sub(bodyOrigin)
        .rotateY(theta)
        .add(bodyPos)
    }, positions, indices, count);

    // draw right leg
    count = this.drawBox(edge => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(rightLegRot)
        .rotateY(theta)
        .add(rightLegPos)
    }, positions, indices, count);

    // draw left leg
    count = this.drawBox(edge => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(leftLegRot)
        .rotateY(theta)
        .add(leftLegPos)
    }, positions, indices, count);

    // draw right arm
    count = this.drawBox(edge => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(rightArmRot)
        .rotateY(theta)
        .add(rightArmPos)
    }, positions, indices, count);

    // draw left arm
    this.drawBox(edge => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(leftArmRot)
        .rotateY(theta)
        .add(leftArmPos)
    }, positions, indices, count);

    this.setBuffers(positions, indices, textureCords);
  }
}
