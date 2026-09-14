import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkdownView, stripSection, extractTitle } from "./MarkdownView";
import { TagChip } from "./TagChip";
import { updateActionItems } from "../api";

function Checkbox({ item, onToggle }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} className="flex-row items-start py-2">
      <View className={`w-5 h-5 rounded-md border mr-3 mt-0.5 items-center justify-center ${item.done ? "bg-flare border-flare" : "bg-white border-lineStrong"}`}>
        {item.done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <Text className={`font-body text-sm flex-1 leading-5 ${item.done ? "text-inkfaint line-through" : "text-ink"}`}>{item.text}</Text>
    </TouchableOpacity>
  );
}
export function NoteDetailModal({ note, onClose, onNoteUpdated }) {
  const [items, setItems] = useState([]);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setItems(note?.actionItems || []);
    setSaveError(null);
  }, [note]);

  if (!note) return <Modal visible={false} transparent onRequestClose={onClose} />;

  const toggle = async (index) => {
    const previous = items;
    const next = items.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item);
    setItems(next);
    setSaveError(null);
    try {
      const updated = await updateActionItems(note.id, next);
      onNoteUpdated?.(updated);
    } catch {
      setItems(previous);
      setSaveError("This change could not be saved. Please try again.");
    }
  };

  const doneCount = items.filter((item) => item.done).length;
  const body = stripSection(note.processed, "Action Items");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end md:justify-center items-center md:px-6">
        <View className="w-full max-w-3xl bg-canvas rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[92%]">
          <View className="bg-white border-b border-line px-5 md:px-7 py-5 flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              <Text className="font-display text-xl text-ink" numberOfLines={2}>{extractTitle(note.raw)}</Text>
              <Text className="font-body text-xs text-inkfaint mt-1">
                {note.createdAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                {` at ${note.createdAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close note" className="w-9 h-9 rounded-xl bg-canvas items-center justify-center">
              <Ionicons name="close" size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
            {!!note.tags?.length && (
              <View className="flex-row flex-wrap mb-5">
                {note.tags.map((tag) => <View key={tag} className="mr-1.5 mb-1.5"><TagChip tag={tag} /></View>)}
              </View>
            )}

            <View className="bg-white rounded-2xl border border-line p-5 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="create-outline" size={18} color="#667085" />
                <Text className="font-displayMed text-sm text-ink ml-2">Original note</Text>
              </View>
              <Text className="font-body text-sm text-inkfaint leading-6">{note.raw}</Text>
            </View>

            {items.length > 0 && (
              <View className="bg-white rounded-2xl border border-line p-5 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle-outline" size={18} color="#635BFF" />
                    <Text className="font-displayMed text-sm text-ink ml-2">Action items</Text>
                  </View>
                  <Text className="font-bodyMed text-xs text-inkfaint">{doneCount} of {items.length} complete</Text>
                </View>
                {items.map((item, index) => <Checkbox key={`${item.text}-${index}`} item={item} onToggle={() => toggle(index)} />)}
                {!!saveError && <Text className="font-body text-xs text-danger mt-2">{saveError}</Text>}
              </View>
            )}

            <View className="bg-white rounded-2xl border border-line p-5">
              <View className="flex-row items-center mb-1">
                <Ionicons name="sparkles-outline" size={18} color="#635BFF" />
                <Text className="font-displayMed text-sm text-ink ml-2">Organized note</Text>
              </View>
              <MarkdownView text={body} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
