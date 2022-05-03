import { MetaAction } from "@tylercraft/src/entities/entity";
import { Vector3D } from "@tylercraft/src/utils/vector";
import { quat } from "gl-matrix";
import { canvas } from "../canvas";
import { ClientGame } from "../clientGame";
import { Controller } from "./controller";



export class Quest2Controller extends Controller {
	constructor(public controlled: ClientGame) {
		super();
	}

	update(_delta: number) {
		const { webXrSession, currentXRFrame, xrRefSpace } = canvas;

		if (!webXrSession || !currentXRFrame || !xrRefSpace) {
			return
		}

		const mainPlayer = this.controlled.mainPlayer;

		const pose = currentXRFrame.getViewerPose(xrRefSpace);

		if (pose) {
			const headQuat = pose.transform.orientation;

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
				this.controlled.mainPlayer.metaActions.add(MetaAction.jump)
			} else {
				this.controlled.mainPlayer.metaActions.delete(MetaAction.jump)
			}

		}
	}
}


