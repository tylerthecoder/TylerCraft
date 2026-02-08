import React from "react";

type Props = {
  score: number;
};

export const ParkorHUD = (props: Props) => {
  return (
    <div>
      <p> Score: {props.score} </p>
    </div>
  );
};
