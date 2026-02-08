import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

const base =
  "inline-flex items-center justify-center rounded-xl bg-white text-black shadow-md hover:shadow-xl transition-shadow duration-150 ease-out cursor-pointer border-0";

export function TitleButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} px-24 py-2.5 text-3xl my-5 ${className}`}
      {...props}
    />
  );
}

export function OptionButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} w-full px-3 py-2 text-2xl mb-1 ${className}`}
      {...props}
    />
  );
}

export function MenuButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${base} px-5 py-2.5 text-base m-1 ${className}`}
      {...props}
    />
  );
}

