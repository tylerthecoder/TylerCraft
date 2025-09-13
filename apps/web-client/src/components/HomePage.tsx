import React from "react";
import { useNavigate } from "react-router-dom";
import { TitleButton } from "./ui/Buttons";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-4 font-['Indie_Flower',cursive]">
        TylerCraft
      </h1>
      <h2 className="text-base font-['Indie_Flower',cursive] -mt-4">
        A 3D sandbox game by Tyler Tracy
      </h2>
      <div className="flex flex-col items-center justify-center mt-10">
        <TitleButton onClick={() => navigate("/client")}>Play Local</TitleButton>
        <TitleButton onClick={() => navigate("/server")}>Play Online</TitleButton>
      </div>
    </div>
  );
}

export default HomePage;
