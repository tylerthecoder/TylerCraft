import {
  Chunk,
  Game,
  IChunkReader,
  ISerializedGame,
  World,
} from "@craft/engine";

const ParkorChunkGetter = async (): Promise<IChunkReader> => {
  const chunkMap = new Map<string, Chunk>();

  const getChunkWithBlocks = () => {};

  return {
    getChunk: (id) => {
      if (id in chunkMap) {
        return chunkMap.get(id);
      }

      const chunk;
    },
  };
};

interface Usecase {
  // chunkReader: IChunkReader;
  makeGame(game: Partial<ISerializedGame>): Game;
  startGame(game: Game): void;
}

class ParkorUsecase implements Usecase {
  chunkReader = ParkorChunkGetter();

  async makeGame(gameDto: ISerializedGame): Promise<Game> {
    const game = Game.make(gameDto, await ParkorChunkGetter(), {
      save: () => {
        console.log("We don't save her");
      },
    });

    return game;
  }

  getGame(gameId: string) {
    // We don't do that
  }

  startGame() {}
}

class ParkorGameScript {
  constructor(game: Game) {}
}
