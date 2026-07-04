import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { extractSummary } from "./MarkdownView";

export function NoteCard({ note, color, onPress, onRequestDelete, widthPct = "48%" }) {
  const preview = extractSummary(note.processed);
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${color.bg} rounded-3xl p-5 mb-4 shadow-sm`}
      style={{ width: widthPct }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`font-mono text-[10px] uppercase tracking-[0.1em] ${color.ink}`}>
          {note.createdAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}{" "}
          ·{" "}
          {note.createdAt.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation?.();
            onRequestDelete(note.id);
          }}
        >
          <Text className={`font-mono text-xs ${color.ink}`}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text className="font-body text-sm text-ink" numberOfLines={5}>
        {preview}…
      </Text>
    </TouchableOpacity>
  );
}
