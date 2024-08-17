import { CONFIG } from "./config.js";
import { PlayerWrapper } from "./wrappers.js";
import { Vector3D } from "./vector.js";

export type Camera = {
  // (x, y, z)
  pos: Vector3D;
  // (dist, theta: [0, 2pi], phi: [0, pi])
  rot: Vector3D;
};

const getPlayerOffset = (player: PlayerWrapper) => {
  return new Vector3D([
    player.dim.get(0) / 2,
    player.dim.get(1) * (9 / 10),
    player.dim.get(2) / 2,
  ]);
};

export const makeCameraForPlayer = (player: PlayerWrapper) => {
  return {
    pos: player.pos.add(getPlayerOffset(player)),
    rot: player.rot,
  };
};

export const makeThirdPersonBackCamera = (
  player: PlayerWrapper,
  dist = CONFIG.player.thirdPersonCamDist
) => {
  const rot = player.rot;
  const pos = player.rot
    .add(new Vector3D([dist, 0, 0]))
    .toCartesianCoords()
    .multiply(new Vector3D([1, -1, 1]))
    .add(getPlayerOffset(player))
    .add(player.pos);
  return {
    pos,
    rot,
  };
};

export const makeThirdPersonFrontCamera = (
  player: PlayerWrapper,
  dist = CONFIG.player.thirdPersonCamDist
) => {
  const rot = player.rot.add(new Vector3D([0, Math.PI, 0]));
  const pos = player.rot
    .add(new Vector3D([dist, Math.PI, 0]))
    .toCartesianCoords()
    .multiply(new Vector3D([1, -1, 1]))
    .add(getPlayerOffset(player))
    .add(player.pos);

  return {
    pos,
    rot,
  };
};

export const makeXRCamera = (player: PlayerWrapper): Camera => {
  const pos = getPlayerOffset(player).add(player.pos);
  const rot = player.rot;
  return {
    pos,
    rot,
  };
};
