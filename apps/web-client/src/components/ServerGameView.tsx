import React from "react";
import { serverRunner } from "../services/mp-games-service";
import { RunningGameView } from "./RunningGameView";

export function ServerGameView() {
  return <RunningGameView runFn={serverRunner} backUrl="/server" />;
}
