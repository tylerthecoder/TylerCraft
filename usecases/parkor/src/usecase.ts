import { Game } from "@craft/engine";

export class ParkorUsecase {
  constructor(private game: Game) {}

  // This function will run for a long time
  async run() {
    let kill = false;

    while (!kill) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Running parkor usecase");
    }
  }
}
