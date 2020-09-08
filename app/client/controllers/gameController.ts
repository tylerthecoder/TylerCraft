import { Controller } from "./controller";
import { ClientGame } from "../clientGame";
import { BLOCKS } from "../../src/blockdata";

export class GameController extends Controller {
  constructor(public controlled: ClientGame) {
    super();
    this.setKeyListeners();
  }

  keysChange() {}

  update(_delta: number) {

    this.ifHasKeyThen("v", () => {
      this.controlled.toggleThirdPerson();
    })

    this.ifHasKeyThen("c", () => {
      this.controlled.toggleCreative();
    })

    this.ifHasKeyThen("p", () => {
      this.controlled.save();
    })

    this.ifHasKeyThen("1", () => {
      this.controlled.selectedBlock = BLOCKS.grass;
    })

    this.ifHasKeyThen("2", () => {
      this.controlled.selectedBlock = BLOCKS.stone;
    })

    this.ifHasKeyThen("3", () => {
      this.controlled.selectedBlock = BLOCKS.wood;
    })

    this.ifHasKeyThen("4", () => {
      this.controlled.selectedBlock = BLOCKS.leaf;
    })

    this.ifHasKeyThen("5", () => {
      this.controlled.selectedBlock = BLOCKS.cloud;
    })

    this.ifHasKeyThen("6", () => {
      this.controlled.selectedBlock = BLOCKS.gold;
    })

    this.ifHasKeyThen("7", () => {
      this.controlled.selectedBlock = BLOCKS.redFlower;
    })
  }


  ifHasKeyThen(key: string, func: () => void) {
    if (this.keysPressed.has(key)) {
      this.keysPressed.delete(key);
      func();
    }
  }
}
