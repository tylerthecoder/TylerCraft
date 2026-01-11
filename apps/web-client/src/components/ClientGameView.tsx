import React from "react";
import { run } from "../services/sp-games-service";
import { RunningGameView } from "./RunningGameView";

export function ClientGameView() {
  return <RunningGameView runFn={run} backUrl="/client" />;
}
