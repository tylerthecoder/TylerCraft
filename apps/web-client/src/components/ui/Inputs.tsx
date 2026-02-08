import React from "react";

export function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
    />
  );
}

export function NumberInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded max-w-[200px] focus:outline-none focus:border-green-500"
    />
  );
}

export function BooleanInput({
  value,
  onChange,
  className,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      className={className}
    />
  );
}
