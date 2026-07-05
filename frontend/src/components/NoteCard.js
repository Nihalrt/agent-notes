import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { extractSummary } from "./MarkdownView";
import { TagChip } from "./TagChip";

export function NoteCard({ note, color, onPress, onRequestDelete, widthPct = "48%" }) {
  const preview = extractSummary(note.processed);
  const items = note.actionItems || [];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
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

      <Text className="font-body text-sm text-ink" numberOfLines={4}>
        {preview}…
      </Text>

      {items.length > 0 && (
        <View className="flex-row items-center mt-3">
          <Text className={`font-mono text-[10px] tracking-[0.05em] ${color.ink}`}>
            ☑ {doneCount}/{items.length} done
          </Text>
        </View>
      )}

      {note.tags && note.tags.length > 0 && (
        <View className="flex-row flex-wrap mt-3 -mb-1">
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} className="mr-1.5 mb-1.5">
              <TagChip tag={tag} />
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
