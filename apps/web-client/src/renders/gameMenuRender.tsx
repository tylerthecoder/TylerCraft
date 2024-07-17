import ReactDOM from "react-dom";
import { Game, GameAction, GameActionType } from "@craft/engine";
import React, { useEffect } from "react";
import styles from "./gameMenu.module.css";
import { getEleOrError } from "../utils";

// make section button with same props as normal button
const SectionButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return <button className={styles.sectionButton} {...props} />;
};

export const GameMenu = (props: { game: Game }) => {
  const game = props.game;
  const [openSection, setOpenSection] = React.useState("main");
  const [isOpen, setIsOpen] = React.useState(false);
  const [gameName, setGameName] = React.useState(game.name);

  const changeGameName = (event: React.ChangeEvent<HTMLInputElement>) => {
    game.handleAction(
      GameAction.create(GameActionType.ChangeName, { name: gameName })
    );
    setGameName(event.target.value);
  };

  const toggleFullScreen = () => {
    console.log("Toggling full screen");
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  };

  const saveGame = () => {
    game.handleAction(GameAction.create(GameActionType.Save, undefined));
  };

  useEffect(() => {
    const keyDownListener = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "p") {
        saveGame();
      } else if (key === "m") {
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", keyDownListener);

    return () => {
      window.removeEventListener("keydown", keyDownListener);
    };
  });

  const mainSection = (
    <>
      <div>
        <p> Game Name: </p>
        <input value={gameName} onChange={changeGameName} type="text" />
      </div>
      <button onClick={toggleFullScreen}>Full Screen</button>
      <button onClick={saveGame}> Save </button>
      <button onClick={() => setIsOpen(false)}> Close </button>
    </>
  );

  const gameScriptSections = game.getScriptActions().map((s, i) => {
    const actions = s.actions;

    return (
      openSection === "script-" + i && (
        <div>
          {actions &&
            Object.keys(actions).map((name) => {
              return <button onClick={() => actions[name]()}>{name}</button>;
            })}

          {s.config && <pre>{JSON.stringify(s.config, null, 2)}</pre>}
        </div>
      )
    );
  });

  const gameScriptButtons = game.getScriptActions().map((_s, i) => {
    return (
      <SectionButton onClick={() => setOpenSection("script-" + i)} key={i}>
        {"GameScript " + (i + 1)}
      </SectionButton>
    );
  });

  return (
    <>
      <button id="menuIcon" onClick={() => setIsOpen(true)}>
        Menu
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <div className={styles.sidebar}>
            <SectionButton onClick={() => setOpenSection("main")}>
              Main Menu
            </SectionButton>
            <SectionButton onClick={() => setOpenSection("about")}>
              About
            </SectionButton>
            <SectionButton onClick={() => setOpenSection("config")}>
              Config
            </SectionButton>

            {gameScriptButtons}
          </div>

          <div className={styles.container}>
            {openSection === "main" && mainSection}
            {openSection === "about" && <AboutSection />}
            {openSection === "config" && <ConfigSection game={game} />}
            {gameScriptSections}
          </div>
        </div>
      )}
    </>
  );
};

const ConfigSection = (props: { game: Game }) => {
  return <pre>{JSON.stringify(props.game.config, null, 2)}</pre>;
};

const AboutSection = () => {
  return (
    <div>
      <p> Made by Tyler Tracy </p>
    </div>
  );
};

// export const renderGameMenu = (game: Game) => {
//   const container = getEleOrError("menuContainer");
//
//   ReactDOM.render(<GameMenu game={game} />, container);
// };
