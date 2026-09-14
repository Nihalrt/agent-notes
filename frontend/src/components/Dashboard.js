import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TagChip } from "./TagChip";
import { extractTitle } from "./MarkdownView";

const STAT_CONFIG = [
  { key: "total_notes", label: "Total notes", icon: "documents-outline", color: "#635BFF", surface: "#F0EEFF" },
  { key: "open_action_items", label: "Open tasks", icon: "radio-button-off-outline", color: "#D97706", surface: "#FFF7E8" },
  { key: "done_action_items", label: "Completed", icon: "checkmark-circle-outline", color: "#15803D", surface: "#ECFDF3" },
  { key: "notes_this_week", label: "This week", icon: "calendar-outline", color: "#0369A1", surface: "#EEF8FF" },
];

function StatCard({ config, value, compact }) {
  return (
    <View className="bg-white rounded-2xl border border-line p-4 mb-3" style={{ width: compact ? "48.5%" : "24%" }}>
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-4" style={{ backgroundColor: config.surface }}>
        <Ionicons name={config.icon} size={19} color={config.color} />
      </View>
      <Text className="font-display text-3xl text-ink">{value ?? 0}</Text>
      <Text className="font-body text-xs text-inkfaint mt-1">{config.label}</Text>
    </View>
  );
}
export function Dashboard({ stats, loading, recentNotes, onOpenNote, onNewNote, onViewTasks, compact }) {
  return (
    <View>
      <View className={`${compact ? "p-5" : "p-7"} bg-shell rounded-3xl mb-5 overflow-hidden`}>
        <View className="max-w-2xl">
          <Text className="font-bodyMed text-xs text-lilac mb-2">YOUR WORKSPACE</Text>
          <Text className="font-display text-2xl md:text-3xl text-white leading-9">Turn quick notes into clear next steps.</Text>
          <Text className="font-body text-sm text-shellFaint mt-2 leading-5">
            Capture an update, decision, or meeting note. Relay organizes the summary, tasks, topics, and related history.
          </Text>
          <View className="flex-row mt-5">
            <TouchableOpacity onPress={onNewNote} activeOpacity={0.82} className="bg-flare rounded-xl px-4 h-10 flex-row items-center justify-center">
              <Ionicons name="add" size={19} color="#FFFFFF" />
              <Text className="font-bodyMed text-sm text-white ml-1.5">Create note</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onViewTasks} activeOpacity={0.72} className="border border-shellLine rounded-xl px-4 h-10 flex-row items-center justify-center ml-2">
              <Text className="font-bodyMed text-sm text-white">View tasks</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 7 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between mb-2">
        {STAT_CONFIG.map((config) => (
          <StatCard key={config.key} config={config} value={loading ? "—" : stats?.[config.key]} compact={compact} />
        ))}
      </View>

      <View className={`${compact ? "" : "flex-row"}`}>
        <View className={`bg-white rounded-2xl border border-line p-5 mb-4 ${compact ? "" : "flex-[1.7] mr-4"}`}>
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="font-displayMed text-base text-ink">Recent notes</Text>
              <Text className="font-body text-xs text-inkfaint mt-0.5">Your latest workspace activity</Text>
            </View>
          </View>
          {recentNotes?.length ? recentNotes.slice(0, 5).map((note, index) => (
            <TouchableOpacity
              key={note.id}
              onPress={() => onOpenNote(note)}
              activeOpacity={0.7}
              className={`flex-row items-center py-3 ${index ? "border-t border-line" : ""}`}
            >
              <View className="w-9 h-9 rounded-xl bg-canvas items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={18} color="#667085" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-bodyMed text-sm text-ink" numberOfLines={1}>{extractTitle(note.raw)}</Text>
                <Text className="font-body text-[11px] text-inkfaint mt-1">
                  {note.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {note.actionItems?.length ? ` · ${note.actionItems.filter((item) => !item.done).length} open tasks` : " · No tasks"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#98A2B3" />
            </TouchableOpacity>
          )) : (
            <View className="items-center py-10">
              <Ionicons name="document-text-outline" size={28} color="#98A2B3" />
              <Text className="font-body text-sm text-inkfaint mt-3">Your recent notes will appear here.</Text>
            </View>
          )}
        </View>

        <View className={`bg-white rounded-2xl border border-line p-5 mb-4 ${compact ? "" : "flex-1"}`}>
          <Text className="font-displayMed text-base text-ink">Top topics</Text>
          <Text className="font-body text-xs text-inkfaint mt-0.5 mb-4">Common themes across your notes</Text>
          {stats?.top_tags?.length ? stats.top_tags.slice(0, 8).map((item) => (
            <View key={item.tag} className="flex-row items-center justify-between mb-3">
              <TagChip tag={item.tag} />
              <Text className="font-bodyMed text-xs text-inkfaint">{item.count}</Text>
            </View>
          )) : (
            <Text className="font-body text-sm text-inkfaint">Topics appear after notes are created.</Text>
          )}
        </View>
      </View>
    </View>
  );
}
