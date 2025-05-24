import { Camera, Vector3D, PlayerWrapper } from "@craft/engine";
import { RenderData, Renderer } from "./renderer";
import ShapeBuilder from "../services/shape-builder";
import TextureMapper from "../textureMapper";
import { WebGlGScript } from "../game-scripts/webgl-gscript";
import { Game, Player } from "@craft/rust-world";

class PlayerRenderWrapper {
  constructor(private player: Player) {}

  get pos() {
    return this.player.pos;
  }

  get distanceMoved() {
    return 0;
  }

  get dim() {
    return new Vector3D([1, 1, 1]);
  }

  get rot() {
    return this.player.rot;
  }
}

export class PlayerRenderer extends Renderer {
  private renderData = new RenderData();

  constructor(
    private game: Game,
    webGlGScript: WebGlGScript,
    public entityId: number
  ) {
    super(webGlGScript);
    this.setActiveTexture(this.webGlGScript.textureAtlas);
  }

  render(camera: Camera) {
    const player = new PlayerRenderWrapper(
      this.game.get_player_wasm(this.entityId)
    );
    this.calculateBuffers(player);
    this.renderObject(
      new Vector3D([player.pos.x, player.pos.y, player.pos.z]),
      camera
    );
  }

  static handSize = new Vector3D([0.2, 0.2, 0.2]);
  drawHand(bodyOffset: Vector3D) {
    ShapeBuilder.buildBox((edge) => {
      return edge.add(bodyOffset);
    }, this.renderData);
  }

  static headSize = new Vector3D([0.6, 0.6, 0.6]);
  static halfHeadSize = PlayerRenderer.headSize.scalarMultiply(0.5);
  drawHead(player: PlayerRenderWrapper) {
    const theta = player.rot.theta;
    const phi = -player.rot.phi + Math.PI / 2;
    const rightLegRot = Math.sin(0);
    const halfPlayerSize = player.dim.scalarMultiply(0.5);
    const headPos = halfPlayerSize.add(new Vector3D([0, 0.9, 0]));
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(PlayerRenderer.headSize)
        .sub(PlayerRenderer.halfHeadSize)
        .rotateZ(-phi)
        .rotateY(theta + rightLegRot)
        .add(headPos);
    }, this.renderData);
  }

  private calculateBuffers(player: PlayerRenderWrapper) {
    this.renderData.clear();
    const { renderData } = this;

    const textureCords = [
      ...TextureMapper.getPlayerTextureCoords(),
      ...TextureMapper.getPlayerTextureCoords(),
    ];

    renderData.pushData({
      textureCords,
    });

    const theta = player.rot.theta;
    // const phi = -this.player.rot.get(2) + Math.PI / 2;

    const armSize = new Vector3D([0.3, 0.8, 0.3]);
    const bodySize = new Vector3D([0.4, 0.8, 0.8]);
    const legSize = new Vector3D([0.4, 0.7, 0.4]);

    const halfPlayerSize = player.dim.scalarMultiply(0.5);
    const bodyOrigin = bodySize.scalarMultiply(0.5);
    const armOrigin = armSize.multiply(new Vector3D([0.5, 1, 0.5]));
    const legOrigin = legSize.multiply(new Vector3D([0.5, 1, 0.5]));

    const bodyPos = halfPlayerSize.add(new Vector3D([0, 0.2, 0]));
    const leftArmPos = halfPlayerSize.add(
      new Vector3D([0, 0.6, 0.55]).rotateY(theta)
    );
    const rightArmPos = halfPlayerSize.add(
      new Vector3D([0, 0.6, -0.55]).rotateY(theta)
    );
    const rightLegPos = halfPlayerSize.add(
      new Vector3D([0, -0.2, 0.2]).rotateY(theta)
    );
    const leftLegPos = halfPlayerSize.add(
      new Vector3D([0, -0.2, -0.2]).rotateY(theta)
    );

    const rightArmRot = Math.sin(player.distanceMoved);
    const leftArmRot = Math.sin(player.distanceMoved + Math.PI);
    const rightLegRot = Math.sin(player.distanceMoved);
    const leftLegRot = Math.sin(player.distanceMoved + Math.PI);

    // draw head
    this.drawHead(player);

    // draw body
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(bodySize)
        .sub(bodyOrigin)
        .rotateY(theta)
        .add(bodyPos);
    }, renderData);

    // draw right leg
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(rightLegRot)
        .rotateY(theta)
        .add(rightLegPos);
    }, renderData);

    // draw left leg
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(legSize)
        .sub(legOrigin)
        .rotateZ(leftLegRot)
        .rotateY(theta)
        .add(leftLegPos);
    }, renderData);

    // draw right arm
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(rightArmRot)
        .rotateY(theta)
        .add(rightArmPos);
    }, renderData);

    // draw left arm
    ShapeBuilder.buildBox((edge) => {
      return edge
        .multiply(armSize)
        .sub(armOrigin)
        .rotateZ(leftArmRot)
        .rotateY(theta)
        .add(leftArmPos);
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
