import { Vector3D } from "./vector.js";
import { Player } from "@craft/rust-world";

export type Camera = {
  // (x, y, z)
  pos: Vector3D;
  // (dist, theta: [0, 2pi], phi: [0, pi])
  rot: Vector3D;
};

const getPlayerOffset = (player: Player) => {
  const dim = player.dim;
  return new Vector3D([dim.x / 2, dim.y * (9 / 10), dim.z / 2]);
};

export const makeCameraForPlayer = (player: Player) => {
  const pos = new Vector3D([player.pos.x, player.pos.y, player.pos.z]);
  const rot = new Vector3D([0, player.rot.phi, player.rot.theta]);
  const adjustedRot = rot.add(new Vector3D([0, 0, 0]));
  return {
    pos: pos.add(getPlayerOffset(player)),
    rot: adjustedRot,
  };
};

export const makeThirdPersonBackCamera = (player: Player, dist = 6) => {
  const rot = new Vector3D([0, player.rot.phi, player.rot.theta]);
  const player_pos = new Vector3D([player.pos.x, player.pos.y, player.pos.z]);

  const pos = rot
    .add(new Vector3D([dist, 0, 0]))
    .toCartesianCoords()
    .multiply(new Vector3D([1, -1, 1]))
    .add(getPlayerOffset(player))
    .add(player_pos);
  return {
    pos,
    rot,
  };
};

export const makeThirdPersonFrontCamera = (player: Player, dist = 6) => {
  const player_rot = new Vector3D([0, player.rot.phi, player.rot.theta]);
  const player_pos = new Vector3D([player.pos.x, player.pos.y, player.pos.z]);

  const rot = player_rot.add(new Vector3D([0, Math.PI, 0]));
  const pos = player_rot
    .add(new Vector3D([dist, Math.PI, 0]))
    .toCartesianCoords()
    .multiply(new Vector3D([1, -1, 1]))
    .add(getPlayerOffset(player))
    .add(player_pos);

  return {
    pos,
    rot,
  };
};

export const makeXRCamera = (player: Player): Camera => {
  const player_pos = new Vector3D([player.pos.x, player.pos.y, player.pos.z]);
  const pos = getPlayerOffset(player).add(player_pos);
  const rot = new Vector3D([0, player.rot.phi, player.rot.theta]);
  return {
    pos,
    rot,
  };
};
