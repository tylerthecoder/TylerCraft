import { MetaAction, Vector3D, EntityController, Player } from "@craft/engine";
import { quat } from "gl-matrix";
import { canvas } from "../../canvas";

export class Quest2Controller extends EntityController {
  constructor(private player: Player) {
    super();
  }

  update() {
    const { webXrSession, currentXRFrame, xrRefSpace } = canvas;

    if (!webXrSession || !currentXRFrame || !xrRefSpace) {
      return;
    }

    const viewerPose = currentXRFrame.getViewerPose(xrRefSpace);

    if (viewerPose) {
      const headQuat = viewerPose.transform.orientation;

      const headsetRot = quat.fromValues(
        headQuat.x,
        headQuat.y,
        headQuat.z,
        headQuat.w
      );
      const inverseHeadsetRot = quat.invert(quat.create(), headsetRot);
      const eye = quat.fromValues(0, 0, 1, 0);
      const resultEye = quat.create();
      quat.mul(resultEye, headsetRot, eye);
      quat.mul(resultEye, resultEye, inverseHeadsetRot);

      const v2 = new Vector3D([resultEye[0], resultEye[1], resultEye[2]]);
      const angles = v2.getSphereAngles();

      angles.set(0, angles.get(0) + Math.PI / 2);
      this.player.rot = new Vector3D([1, angles.get(0), angles.get(1)]);
    }

    const rightController = webXrSession.inputSources[0];
    const rightHandPose = currentXRFrame.getPose(
      rightController.targetRaySpace,
      xrRefSpace
    );

    if (rightHandPose && viewerPose) {
      this.player.rightHandPosition = new Vector3D([
        rightHandPose.transform.position.x,
        rightHandPose.transform.position.y,
        rightHandPose.transform.position.z,
      ]);
    }

    const leftController = webXrSession.inputSources[1];
    const leftHandPose = currentXRFrame.getPose(
      leftController.targetRaySpace,
      xrRefSpace
    );

    if (leftHandPose && viewerPose) {
      this.player.leftHandPosition = new Vector3D([
        leftHandPose.transform.position.x,
        leftHandPose.transform.position.y,
        leftHandPose.transform.position.z,
      ]);
    }

    for (const device of webXrSession.inputSources) {
      const { gamepad } = device;

      if (!gamepad) {
        return;
      }

      if (gamepad.axes[2] > 0.5) {
        this.player.metaActions.add(MetaAction.forward);
      } else if (gamepad.axes[2] < -0.5) {
        this.player.metaActions.add(MetaAction.backward);
      } else {
        this.player.metaActions.delete(MetaAction.forward);
        this.player.metaActions.delete(MetaAction.backward);
      }

      if (gamepad.axes[3] > 0.5) {
        this.player.metaActions.add(MetaAction.right);
      } else if (gamepad.axes[3] < -0.5) {
        this.player.metaActions.add(MetaAction.left);
      } else {
        this.player.metaActions.delete(MetaAction.left);
        this.player.metaActions.delete(MetaAction.right);
      }

      if (gamepad.buttons[4].pressed) {
        this.player.metaActions.add(MetaAction.jump);
      } else {
        this.player.metaActions.delete(MetaAction.jump);
      }
    }
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }
}
