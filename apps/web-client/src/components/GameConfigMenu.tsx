import React, { useEffect, useState } from "react";
import { Game } from "@craft/rust-world";

interface GameConfigMenuProps {
  game: Game;
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

export function GameConfigMenu({ game, isOpen, onClose }: GameConfigMenuProps) {
  const [scriptNames, setScriptNames] = useState<string[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<{
    [scriptName: string]: ScriptConfig;
  }>({});
  const [chunkFetcherConfig, setChunkFetcherConfig] =
    useState<ChunkFetcherConfig>({});
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (isOpen && game) {
      // Get all script names
      const names = game.get_all_script_names_wasm();
      setScriptNames(names);

      // Get configs for all scripts
      const configs: { [scriptName: string]: ScriptConfig } = {};
      names.forEach((name) => {
        try {
          const config: Map<string, any> = game.get_script_config_wasm(name);
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
        const chunkConfig: ChunkFetcherConfig = game.chunk_fetcher.get_config();
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

      // Set first available tab as active
      if (!activeTab) {
        if (names.length > 0) {
          setActiveTab(names[0]);
        } else {
          setActiveTab("Chunk Fetcher");
        }
      }
    }
  }, [isOpen, game, activeTab]);

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
      game.set_script_config_wasm(scriptName, updatedConfigs[scriptName]);
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
      game.chunk_fetcher.set_config(updatedConfig);
    } catch (error) {
      console.error("Failed to update chunk fetcher config:", error);
    }
  };

  const renderConfigValue = (scriptName: string, key: string, value: any) => {
    console.log("RenderConfigValue", scriptName, key, value);
    const handleChange = (newValue: any) => {
      handleConfigChange(scriptName, key, newValue);
    };

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      );
    } else if (typeof value === "number") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="number"
            value={value}
            step={value % 1 === 0 ? 1 : 0.1}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
          />
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

  const renderChunkFetcherConfigValue = (key: string, value: any) => {
    console.log("RenderChunkFetcherConfigValue", key, value);
    const handleChange = (newValue: any) => {
      handleChunkFetcherConfigChange(key, newValue);
    };

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      );
    } else if (typeof value === "number") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="number"
            value={value}
            step={value % 1 === 0 ? 1 : 0.1}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div className="flex items-center gap-3 mb-2">
          <span className="min-w-[150px] text-gray-400">{key}:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
          />
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
      <div className="bg-gray-900 border-2 border-gray-700 rounded-lg w-[90%] max-w-4xl h-[80vh] max-h-[600px] text-white font-mono">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="m-0 text-green-500 text-xl font-bold">
            Game Configuration
          </h2>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white border-0 w-8 h-8 rounded-full cursor-pointer text-lg flex items-center justify-center focus:outline-none"
          >
            ×
          </button>
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
