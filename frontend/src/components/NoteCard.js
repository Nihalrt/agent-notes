import React from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { extractSummary, extractTitle } from "./MarkdownView";
import { TagChip } from "./TagChip";

export function NoteCard({ note, onPress, onRequestDelete, widthPct = "100%" }) {
  const preview = extractSummary(note.processed);
  const items = note.actionItems || [];
  const doneCount = items.filter((item) => item.done).length;
  const progress = items.length ? doneCount / items.length : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open note: ${extractTitle(note.raw)}`}
      className="bg-white rounded-2xl border border-line p-5 mb-4"
      style={({ pressed }) => ({
        width: widthPct,
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        shadowColor: "#101828",
        shadowOpacity: pressed ? 0.02 : 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      })}
    >
      <View className="flex-row items-start justify-between mb-4">
        <View className="w-9 h-9 rounded-xl bg-flareSoft items-center justify-center">
          <Ionicons name="document-text-outline" size={18} color="#635BFF" />
        </View>
        <TouchableOpacity
          accessibilityLabel="Delete note"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={(event) => {
            event.stopPropagation?.();
            onRequestDelete(note.id);
          }}
          className="w-8 h-8 rounded-lg items-center justify-center"
        >
          <Ionicons name="trash-outline" size={17} color="#98A2B3" />
        </TouchableOpacity>
      </View>

      <Text className="font-displayMed text-base text-ink leading-5 mb-2" numberOfLines={2}>{extractTitle(note.raw)}</Text>
      <Text className="font-body text-sm text-inkfaint leading-5" numberOfLines={3}>{preview}</Text>

      {!!note.tags?.length && (
        <View className="flex-row flex-wrap mt-4 -mb-1">
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} className="mr-1.5 mb-1.5"><TagChip tag={tag} /></View>
          ))}
          {note.tags.length > 3 && <Text className="font-bodyMed text-[11px] text-inkfaint mt-1">+{note.tags.length - 3}</Text>}
        </View>
      )}

      <View className="border-t border-line mt-4 pt-3 flex-row items-center justify-between">
        <Text className="font-body text-[11px] text-inkfaint">
          {note.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </Text>
        {items.length > 0 ? (
          <View className="flex-row items-center">
            <View className="w-16 h-1.5 rounded-full bg-line overflow-hidden mr-2">
              <View className="h-full rounded-full bg-success" style={{ width: `${progress * 100}%` }} />
            </View>
            <Text className="font-bodyMed text-[11px] text-inkfaint">{doneCount}/{items.length}</Text>
          </View>
        ) : (
          <Text className="font-body text-[11px] text-inkfaint">No tasks</Text>
        )}
      </View>
    </Pressable>
  );
}
