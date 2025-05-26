import React from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-16">TylerCraft</h1>
      <h2 id="subtitle" className="text-sm">
        A 3D sandbox by Tyler Tracy
      </h2>
      <div>
        <button onClick={() => navigate("/client")}>Play Local</button>
        <button onClick={() => navigate("/server")}>Play Online</button>
      </div>
    </div>
  );
}

export default HomePage;
