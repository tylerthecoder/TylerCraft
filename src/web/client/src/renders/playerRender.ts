import { Player, Camera, Vector3D, IDim } from "@craft/engine";
import { RenderData, Renderer } from "./renderer";
import ShapeBuilder from "../services/shapeBuilder";
import { canvas } from "../canvas";
import TextureMapper from "../textureMapper";

export class PlayerRenderer extends Renderer {

  private renderData = new RenderData();

  constructor(public player: Player) {
    super();
    this.setActiveTexture(canvas.textureAtlas);
  }

  render(camera: Camera) {
    this.calculateBuffers();
    this.renderObject(this.player.pos.data as IDim, camera);
  }

  static handSize = new Vector3D([.2, .2, .2]);
  drawHand(bodyOffset: Vector3D) {
    ShapeBuilder.buildBox(edge => {
      return edge
        .add(bodyOffset)
    }, this.renderData);
  }

  static headSize = new Vector3D([.6, .6, .6]);
  static halfHeadSize = PlayerRenderer.headSize.scalarMultiply(0.5);
  drawHead() {
    const theta = this.player.rot.get(1);
    const phi = -this.player.rot.get(2) + Math.PI / 2;
    const rightLegRot = Math.sin(this.player.distanceMoved);
    const playerDimVec = new Vector3D(this.player.dim);
    const halfPlayerSize = playerDimVec.scalarMultiply(.5);
    const headPos = halfPlayerSize.add(new Vector3D([0, .9, 0]));
    ShapeBuilder.buildBox(edge => {
      return edge
        .multiply(PlayerRenderer.headSize)
        .sub(PlayerRenderer.halfHeadSize)
        .rotateZ(-phi)
        .rotateY(theta + rightLegRot)
        .add(headPos)
    }, this.renderData);
  }

  private calculateBuffers() {
    this.renderData.clear();
    const { renderData } = this;

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
    const legSize = new Vector3D([.4, .7, .4]);

    const halfPlayerSize = playerDimVec.scalarMultiply(.5);
    const bodyOrigin = bodySize.scalarMultiply(.5);
    const armOrigin = armSize.multiply(new Vector3D([.5, 1, .5]));
    const legOrigin = legSize.multiply(new Vector3D([.5, 1, .5]));

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
    this.drawHead();

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


    // Draw hands if they have them
    // if (this.player.rightHandPosition) {
    //   this.drawHand(this.player.rightHandPosition);
    // }

    // if (this.player.leftHandPosition) {
    //   this.drawHand(this.player.leftHandPosition);
    // }



    this.setBuffers(renderData);

  }
}
