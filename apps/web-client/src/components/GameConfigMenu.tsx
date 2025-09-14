import React, { useEffect, useState } from "react";
import { BooleanInput, NumberInput, TextInput } from "./ui/Inputs";
import { RunningGame } from "../services/sp-games-service";
import { useNavigate } from "react-router-dom";

interface GameConfigMenuProps {
  runningGame: RunningGame;
  isOpen: boolean;
  onClose: () => void;
}

interface ScriptConfig {
  [key: string]: any;
}

interface ChunkFetcherConfig {
  type: string;
  json: {
    [key: string]: any;
  };
}

type ActiveTab = "Chunk Fetcher" | "Game Config" | string;

function MenuLabel({ children }: { children: React.ReactNode }) {
  return <span className="min-w-[150px] text-gray-400">{children}</span>;
}

export function GameConfigMenu({
  runningGame,
  isOpen,
  onClose,
}: GameConfigMenuProps) {
  const game = runningGame.game;
  const [scriptNames, setScriptNames] = useState<string[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<{
    [scriptName: string]: ScriptConfig;
  }>({});
  const [chunkFetcherConfig, setChunkFetcherConfig] =
    useState<ChunkFetcherConfig>(game.serializeChunkFetcher());
  const [activeTab, setActiveTab] = useState<ActiveTab>("Game Config");
  const [gameName, setGameName] = useState<string>(game.name);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && runningGame) {
      // Get all script names
      const names = game.getScriptNames();
      setScriptNames(names);

      // Get configs for all scripts
      const configs: { [scriptName: string]: ScriptConfig } = {};
      names.forEach((name) => {
        try {
          const config: Map<string, any> = game.getScriptConfig(name);
          console.log("Config", name, config);
          if (config) {
            if (config instanceof Map) {
              configs[name] = Object.fromEntries(config);
            } else {
              configs[name] = config;
            }
          }
        } catch (error) {
          console.warn(`Failed to get config for script ${name}:`, error);
          configs[name] = {};
        }
      });

      console.log("Configs", configs);

      setScriptConfigs(configs);

      // Get chunk fetcher config
      try {
        const chunkConfig: ChunkFetcherConfig = game.serializeChunkFetcher();
        console.log("Chunk Fetcher Config", chunkConfig);
        if (chunkConfig) {
          if (chunkConfig.json instanceof Map) {
            chunkConfig.json = Object.fromEntries(chunkConfig.json);
          }
          setChunkFetcherConfig(chunkConfig);
        }
      } catch (error) {
        console.warn("Failed to get chunk fetcher config:", error);
        setChunkFetcherConfig({ type: "", json: {} });
      }
    }
  }, [isOpen, runningGame, activeTab]);

  const handleConfigChange = (scriptName: string, key: string, value: any) => {
    const updatedConfigs = {
      ...scriptConfigs,
      [scriptName]: {
        ...scriptConfigs[scriptName],
        [key]: value,
      },
    };
    setScriptConfigs(updatedConfigs);

    // Update the game script config
    try {
      game.setScriptConfig(scriptName, updatedConfigs[scriptName]);
    } catch (error) {
      console.error(`Failed to update config for script ${scriptName}:`, error);
    }
  };

  const handleChunkFetcherConfigChange = (key: string, value: any) => {
    const updatedConfig = {
      ...chunkFetcherConfig,
      json: {
        ...chunkFetcherConfig.json,
        [key]: value,
      },
    };
    setChunkFetcherConfig(updatedConfig);

    // Update the game chunk fetcher config
    try {
      game.setChunkFetcherConfig(updatedConfig);
    } catch (error) {
      console.error("Failed to update chunk fetcher config:", error);
    }
  };

  const handleGameNameChange = (value: string) => {
    game.name = value;
    setGameName(value);
  };

  const handleSaveGame = () => {
    runningGame.save();
  };

  const handleExit = () => {
    runningGame.cleanup();
    navigate("/client");
  };

  const renderConfigValue = (scriptName: string, key: string, value: any) => {
    console.log("RenderConfigValue", scriptName, key, value);
    const handleChange = (newValue: any) => {
      handleConfigChange(scriptName, key, newValue);
    };

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <MenuLabel>{key}:</MenuLabel>
          <BooleanInput value={value} onChange={(e) => handleChange(e)} />
        </div>
      );
    } else if (typeof value === "number") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <MenuLabel>{key}:</MenuLabel>
          <NumberInput
            value={value}
            step={value % 1 === 0 ? 1 : 0.1}
            onChange={(e) => handleChange(e)}
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <MenuLabel>{key}:</MenuLabel>
          <TextInput value={value} onChange={(e) => handleChange(e)} />
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-3 mb-2">
          <MenuLabel>{key}:</MenuLabel>
          <span className="text-yellow-400 font-mono">
            {JSON.stringify(value)}
          </span>
        </div>
      );
    }
  };

  const renderChunkFetcherConfigValue = (key: string, value: any) => {
    console.log("RenderChunkFetcherConfigValue", key, value);
    const handleChange = (newValue: any) => {
      handleChunkFetcherConfigChange(key, newValue);
    };

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <BooleanInput value={value} onChange={(e) => handleChange(e)} />
        </div>
      );
    } else if (typeof value === "number") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <NumberInput
            value={value}
            step={value % 1 === 0 ? 1 : 0.1}
            onChange={(e) => handleChange(e)}
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <TextInput value={value} onChange={(e) => handleChange(e)} />
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <span className="text-yellow-400 font-mono">
            {JSON.stringify(value)}
          </span>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  const activeConfig = scriptConfigs[activeTab];

  console.log("ActiveConfig", activeConfig, scriptConfigs, activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[1000]">
      <div className="bg-gray-900 border-2 border-gray-700 rounded-lg w-[90%] max-w-[1200px] h-[80vh] max-h-[800px] text-white font-mono">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="m-0 text-green-500 text-xl font-bold">Menu</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 px-3 py-1.5 rounded cursor-pointer text-sm flex items-center justify-center focus:outline-none"
              title="Exit to Client"
            >
              Exit
            </button>
            <button
              onClick={handleSaveGame}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1.5 rounded cursor-pointer text-sm flex items-center justify-center focus:outline-none"
              title="Save Game"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white border-0 w-8 h-8 rounded-full cursor-pointer text-lg flex items-center justify-center focus:outline-none"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100%-80px)]">
          {scriptNames.length === 0 &&
            chunkFetcherConfig.json &&
            Object.keys(chunkFetcherConfig.json).length === 0 ? (
            <div className="text-center text-gray-500 p-8 w-full">
              No configuration options found
            </div>
          ) : (
            <>
              <div className="w-48 border-r border-gray-700 overflow-y-auto">
                <button
                  onClick={() => setActiveTab("Game Config")}
                  className={`block w-full px-4 py-3 text-left cursor-pointer border-b border-gray-700 transition-colors ${activeTab === "Game Config"
                      ? "bg-green-500 text-white"
                      : "bg-transparent text-gray-400 hover:bg-gray-800"
                    }`}
                >
                  Game Config
                </button>
                {/* Chunk Fetcher Tab */}
                <button
                  onClick={() => setActiveTab("Chunk Fetcher")}
                  className={`block w-full px-4 py-3 text-left cursor-pointer border-b border-gray-700 transition-colors ${activeTab === "Chunk Fetcher"
                      ? "bg-green-500 text-white"
                      : "bg-transparent text-gray-400 hover:bg-gray-800"
                    }`}
                >
                  Chunk Fetcher
                </button>

                {/* Script Tabs */}
                {scriptNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setActiveTab(name)}
                    className={`block w-full px-4 py-3 text-left cursor-pointer border-b border-gray-700 transition-colors ${activeTab === name
                        ? "bg-green-500 text-white"
                        : "bg-transparent text-gray-400 hover:bg-gray-800"
                      }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === "Chunk Fetcher" ? (
                  <div>
                    <h3 className="mt-0 text-green-500 border-b border-gray-700 pb-2 mb-4">
                      Chunk Fetcher Configuration
                    </h3>
                    {Object.entries(chunkFetcherConfig.json).map(
                      ([key, value]) => (
                        <div key={key}>
                          {renderChunkFetcherConfigValue(key, value)}
                        </div>
                      )
                    )}
                    {Object.keys(chunkFetcherConfig).length === 0 && (
                      <div className="text-center text-gray-500 p-8">
                        No configuration options available
                      </div>
                    )}
                  </div>
                ) : activeTab === "Game Config" ? (
                  <div>
                    <h3 className="mt-0 text-green-500 border-b border-gray-700 pb-2 mb-4">
                      Game Config
                    </h3>

                    <MenuLabel>Game Name:</MenuLabel>
                    <TextInput
                      value={gameName}
                      onChange={(e) => handleGameNameChange(e)}
                    />
                  </div>
                ) : activeTab && scriptConfigs[activeTab] ? (
                  <div>
                    <h3 className="mt-0 text-green-500 border-b border-gray-700 pb-2 mb-4">
                      {activeTab} Configuration
                    </h3>
                    {Object.entries(scriptConfigs[activeTab]).map(
                      ([key, value]) => (
                        <div key={key}>
                          {renderConfigValue(activeTab, key, value)}
                        </div>
                      )
                    )}
                    {Object.keys(scriptConfigs[activeTab]).length === 0 && (
                      <div className="text-center text-gray-500 p-8">
                        No configuration options available
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
