import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { tagColor } from "../constants";

export function TagChip({ tag, onPress, active }) {
  const color = tagColor(tag);
  const chip = (
    <Text
      className={`font-mono text-[9px] uppercase tracking-[0.08em] px-2 py-1 rounded-full ${color.bg} ${color.ink} ${
        active ? "opacity-100" : ""
      }`}
    >
      #{tag}
    </Text>
  );
  if (!onPress) return chip;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={active ? "" : "opacity-90"}
    >
      {chip}
    </TouchableOpacity>
  );
}
