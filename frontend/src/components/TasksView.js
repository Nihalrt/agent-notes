import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { extractTitle } from "./MarkdownView";
import { updateActionItems } from "../api";

export function TasksView({ notes, onNoteUpdated, onOpenNote }) {
  const [error, setError] = useState(null);
  const tasks = useMemo(() => {
    const rows = [];
    notes.forEach((note) => (note.actionItems || []).forEach((item, index) => rows.push({ note, item, index })));
    return rows.sort((left, right) => Number(left.item.done) - Number(right.item.done));
  }, [notes]);

  const toggle = async ({ note, item, index }) => {
    const nextItems = note.actionItems.map((current, itemIndex) => itemIndex === index ? { ...current, done: !item.done } : current);
    const optimistic = { ...note, actionItems: nextItems };
    onNoteUpdated(optimistic);
    setError(null);
    try {
      const updated = await updateActionItems(note.id, nextItems);
      onNoteUpdated(updated);
    } catch {
      onNoteUpdated(note);
      setError("This task could not be updated. Please try again.");
    }
  };

  const openCount = tasks.filter(({ item }) => !item.done).length;
  const completedCount = tasks.length - openCount;

  return (
    <View>
      <View className="flex-row items-end justify-between mb-5">
        <View>
          <Text className="font-display text-2xl text-ink">Action items</Text>
          <Text className="font-body text-sm text-inkfaint mt-1">{openCount} open · {completedCount} completed</Text>
        </View>
      </View>

      {!!error && (
        <View className="bg-dangerSoft rounded-xl px-4 py-3 mb-4 flex-row items-center">
          <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
          <Text className="font-body text-xs text-danger ml-2">{error}</Text>
        </View>
      )}

      {!tasks.length ? (
        <View className="bg-white border border-line rounded-2xl items-center px-6 py-14">
          <View className="w-12 h-12 rounded-2xl bg-successSoft items-center justify-center">
            <Ionicons name="checkmark-circle-outline" size={25} color="#15803D" />
          </View>
          <Text className="font-displayMed text-base text-ink mt-4">No action items yet</Text>
          <Text className="font-body text-sm text-inkfaint text-center mt-1 max-w-sm">Tasks extracted from your notes will appear here.</Text>
        </View>
      ) : (
        <View className="bg-white border border-line rounded-2xl overflow-hidden">
          {tasks.map((task, rowIndex) => (
            <View key={`${task.note.id}-${task.index}`} className={`flex-row items-start p-4 md:px-5 ${rowIndex ? "border-t border-line" : ""}`}>
              <TouchableOpacity onPress={() => toggle(task)} accessibilityLabel={task.item.done ? "Mark task open" : "Mark task complete"} className="pt-0.5">
                <View className={`w-5 h-5 rounded-md border items-center justify-center ${task.item.done ? "bg-flare border-flare" : "border-lineStrong bg-white"}`}>
                  {task.item.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onOpenNote(task.note)} activeOpacity={0.7} className="flex-1 ml-3">
                <Text className={`font-body text-sm leading-5 ${task.item.done ? "text-inkfaint line-through" : "text-ink"}`}>{task.item.text}</Text>
                <Text className="font-body text-[11px] text-inkfaint mt-1" numberOfLines={1}>{extractTitle(task.note.raw)}</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={17} color="#98A2B3" style={{ marginTop: 2 }} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

