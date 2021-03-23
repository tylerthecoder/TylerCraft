import { Player } from "../../src/entities/player";
import { Camera } from "../../src/camera";
import TextureMapper from "../textureMapper";
import { RenderData, Renderer } from "./renderer";
import { Vector3D } from "../../src/utils/vector";
import TextureService from "../services/textureService";
import ShapeBuilder from "../services/shapeBuilder";

export class PlayerRenderer extends Renderer {

  constructor(public player: Player) {
    super();
    this.setActiveTexture(TextureService.textureAtlas);
  }

  render(camera: Camera) {
    this.calculateBuffers();
    this.renderObject(this.player.pos.data, camera);
  }

  private calculateBuffers() {
    const renderData = new RenderData();

    const textureCords = [
      ...TextureMapper.getPlayerTextureCoords(),
      ...TextureMapper.getPlayerTextureCoords(),
    ];

    renderData.pushData({
      textureCords,
    });


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
    const armOrigin = armSize.multiply(new Vector3D([.5, 1, .5]));
    const legOrigin = legSize.multiply(new Vector3D([.5, 1, .5]));

    const headPos = halfPlayerSize.add(new Vector3D([0, .9, 0]));
    const bodyPos = halfPlayerSize.add(new Vector3D([0, .2, 0]));
    const leftArmPos = halfPlayerSize.add(new Vector3D([0, .6, .55]).rotateY(theta));
    const rightArmPos = halfPlayerSize.add(new Vector3D([0, .6, -.55]).rotateY(theta));
    const rightLegPos = halfPlayerSize.add(new Vector3D([0, -.2, 0.2]).rotateY(theta));
    const leftLegPos = halfPlayerSize.add(new Vector3D([0, -.2, -0.2]).rotateY(theta));

    const rightArmRot = Math.sin(this.player.distanceMoved);
    const leftArmRot = Math.sin(this.player.distanceMoved + Math.PI);
    const rightLegRot = Math.sin(this.player.distanceMoved);
    const leftLegRot = Math.sin(this.player.distanceMoved + Math.PI);

    // draw head
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(headSize)
        .sub(halfHeadSize)
        .rotateZ(-phi)
        .rotateY(theta + rightLegRot)
        .add(headPos)
    }, renderData);

    // draw body
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(bodySize)
        .sub(bodyOrigin)
        .rotateY(theta)
        .add(bodyPos)
    }, renderData);

    // draw right leg
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(rightLegRot)
        .rotateY(theta)
        .add(rightLegPos)
    }, renderData);

    // draw left leg
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(leftLegRot)
        .rotateY(theta)
        .add(leftLegPos)
    }, renderData);

    // draw right arm
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(rightArmRot)
        .rotateY(theta)
        .add(rightArmPos)
    }, renderData);

    // draw left arm
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(leftArmRot)
        .rotateY(theta)
        .add(leftArmPos)
    }, renderData);

    this.setBuffers(renderData);

  }
}
