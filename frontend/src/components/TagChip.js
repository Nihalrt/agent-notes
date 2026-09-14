import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { tagColor } from "../constants";

export function TagChip({ tag, onPress, active = false }) {
  const color = tagColor(tag);
  const content = (
    <Text
      className={`font-bodyMed text-[11px] px-2.5 py-1 rounded-lg ${
        active ? "bg-flare text-white" : `${color.bg} ${color.ink}`
      }`}
    >
      {tag}
    </Text>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
      {content}
    </TouchableOpacity>
  );
}
