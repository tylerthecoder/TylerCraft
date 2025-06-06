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

export function GameConfigMenu({ game, isOpen, onClose }: GameConfigMenuProps) {
  const [scriptNames, setScriptNames] = useState<string[]>([]);
  const [scriptConfigs, setScriptConfigs] = useState<{
    [scriptName: string]: ScriptConfig;
  }>({});
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
            configs[name] = Object.fromEntries(config);
          }
        } catch (error) {
          console.warn(`Failed to get config for script ${name}:`, error);
          configs[name] = {};
        }
      });
      setScriptConfigs(configs);

      // Set first script as active tab
      if (names.length > 0 && !activeTab) {
        setActiveTab(names[0]);
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

  const renderConfigValue = (scriptName: string, key: string, value: any) => {
    console.log("RenderConfigValue", scriptName, key, value);
    const handleChange = (newValue: any) => {
      handleConfigChange(scriptName, key, newValue);
    };

    if (typeof value === "boolean") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ minWidth: "150px", color: "#ccc" }}>{key}:</span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleChange(e.target.checked)}
          />
        </div>
      );
    } else if (typeof value === "number") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ minWidth: "150px", color: "#ccc" }}>{key}:</span>
          <input
            type="number"
            value={value}
            step={value % 1 === 0 ? 1 : 0.1}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            style={{
              background: "#333",
              border: "1px solid #555",
              color: "white",
              padding: "6px 12px",
              borderRadius: "4px",
              maxWidth: "200px",
            }}
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ minWidth: "150px", color: "#ccc" }}>{key}:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              background: "#333",
              border: "1px solid #555",
              color: "white",
              padding: "6px 12px",
              borderRadius: "4px",
              maxWidth: "200px",
            }}
          />
        </div>
      );
    } else {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ minWidth: "150px", color: "#ccc" }}>{key}:</span>
          <span style={{ color: "#ffc107", fontFamily: "monospace" }}>
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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "2px solid #333",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "800px",
          height: "80vh",
          maxHeight: "600px",
          color: "white",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            borderBottom: "1px solid #333",
          }}
        >
          <h2 style={{ margin: 0, color: "#4CAF50" }}>
            Game Script Configuration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#f44336",
              color: "white",
              border: "none",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", height: "calc(100% - 80px)" }}>
          {scriptNames.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#888",
                padding: "2rem",
                width: "100%",
              }}
            >
              No game scripts found
            </div>
          ) : (
            <>
              <div
                style={{
                  width: "200px",
                  borderRight: "1px solid #333",
                  overflowY: "auto",
                }}
              >
                {scriptNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setActiveTab(name)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      background: activeTab === name ? "#4CAF50" : "none",
                      border: "none",
                      color: activeTab === name ? "white" : "#ccc",
                      textAlign: "left",
                      cursor: "pointer",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
                {activeTab && scriptConfigs[activeTab] && (
                  <div>
                    <h3
                      style={{
                        marginTop: 0,
                        color: "#4CAF50",
                        borderBottom: "1px solid #333",
                        paddingBottom: "0.5rem",
                      }}
                    >
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
                      <div
                        style={{
                          textAlign: "center",
                          color: "#888",
                          padding: "2rem",
                        }}
                      >
                        No configuration options available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
