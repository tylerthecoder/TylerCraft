import { MetaAction } from "@tylercraft/src/entities/entity";
import { Vector3D } from "@tylercraft/src/utils/vector";
import { quat } from "gl-matrix";
import { canvas } from "../canvas";
import { ClientGame } from "../clientGame";
import { GameController } from "@tylercraft/src/controllers/controller";


export class Quest2Controller extends GameController {

	constructor(
		protected clientGame: ClientGame
	) {
		super(clientGame);
	}

	update(_delta: number) {
		const { webXrSession, currentXRFrame, xrRefSpace } = canvas;

		if (!webXrSession || !currentXRFrame || !xrRefSpace) {
			return
		}

		const mainPlayer = this.clientGame.mainPlayer;

		const viewerPose = currentXRFrame.getViewerPose(xrRefSpace);

		if (viewerPose) {
			const headQuat = viewerPose.transform.orientation;

			const headsetRot = quat.fromValues(headQuat.x, headQuat.y, headQuat.z, headQuat.w);
			const inverseHeadsetRot = quat.invert(quat.create(), headsetRot);
			const eye = quat.fromValues(0, 0, 1, 0);
			const resultEye = quat.create();
			quat.mul(resultEye, headsetRot, eye);
			quat.mul(resultEye, resultEye, inverseHeadsetRot);

			const v2 = new Vector3D([resultEye[0], resultEye[1], resultEye[2]]);
			const angles = v2.getSphereAngles()

			angles.set(0, angles.get(0) + Math.PI / 2);
			mainPlayer.rot = new Vector3D([
				1,
				angles.get(0),
				angles.get(1)
			]);
		}


		const rightController = webXrSession.inputSources[0];
		const rightHandPose = currentXRFrame.getPose(rightController.targetRaySpace, xrRefSpace);

		if (rightHandPose && viewerPose) {
			this.clientGame.mainPlayer.rightHandPosition = new Vector3D([
				rightHandPose.transform.position.x,
				rightHandPose.transform.position.y,
				rightHandPose.transform.position.z
			]);
		}

		const leftController = webXrSession.inputSources[1];
		const leftHandPose = currentXRFrame.getPose(leftController.targetRaySpace, xrRefSpace);

		if (leftHandPose && viewerPose) {
			this.clientGame.mainPlayer.leftHandPosition = new Vector3D([
				leftHandPose.transform.position.x,
				leftHandPose.transform.position.y,
				leftHandPose.transform.position.z
			]);
		}

		for (const device of webXrSession.inputSources) {
			const { gamepad } = device;

			if (!gamepad) {
				return;
			}

			if (gamepad.axes[2] > 0.5) {
				mainPlayer.metaActions.add(MetaAction.forward)
			} else if (gamepad.axes[2] < -0.5) {
				mainPlayer.metaActions.add(MetaAction.backward)
			} else {
				mainPlayer.metaActions.delete(MetaAction.forward);
				mainPlayer.metaActions.delete(MetaAction.backward);
			}

			if (gamepad.axes[3] > 0.5) {
				mainPlayer.metaActions.add(MetaAction.right)
			} else if (gamepad.axes[3] < -0.5) {
				mainPlayer.metaActions.add(MetaAction.left)
			} else {
				mainPlayer.metaActions.delete(MetaAction.left);
				mainPlayer.metaActions.delete(MetaAction.right);
			}

			if (gamepad.buttons[4].pressed) {
				this.clientGame.mainPlayer.metaActions.add(MetaAction.jump)
			} else {
				this.clientGame.mainPlayer.metaActions.delete(MetaAction.jump)
			}

		}
	}
}


