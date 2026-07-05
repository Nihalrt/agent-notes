import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { MarkdownView, stripSection } from "./MarkdownView";
import { TagChip } from "./TagChip";
import { updateActionItems } from "../api";

function Checkbox({ item, onToggle }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      className="flex-row items-start mb-2.5"
    >
      <View
        className={`w-5 h-5 rounded-md border mr-3 mt-0.5 items-center justify-center ${
          item.done ? "bg-flare border-flare" : "bg-white border-line"
        }`}
      >
        {item.done && <Text className="text-white text-xs leading-none">✓</Text>}
      </View>
      <Text
        className={`font-body text-sm flex-1 leading-6 ${
          item.done ? "text-inkfaint line-through" : "text-ink"
        }`}
      >
        {item.text}
      </Text>
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

  if (!note) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }

  const toggle = async (index) => {
    const previous = items;
    const next = items.map((it, i) =>
      i === index ? { ...it, done: !it.done } : it
    );
    setItems(next);
    setSaveError(null);
    try {
      const updated = await updateActionItems(note.id, next);
      onNoteUpdated?.(updated);
    } catch {
      setItems(previous);
      setSaveError("Couldn't save that change. Is the backend running?");
    }
  };

  const doneCount = items.filter((i) => i.done).length;
  const body = stripSection(note.processed, "Action Items");

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/30 justify-end items-center">
        <View className="w-full max-w-2xl bg-paper rounded-t-3xl md:rounded-3xl md:mb-8 p-6 max-h-[85%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em]">
              processed note
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="font-bodyMed text-inkfaint">Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {note.tags && note.tags.length > 0 && (
              <View className="flex-row flex-wrap mb-5 -mb-0.5">
                {note.tags.map((tag) => (
                  <View key={tag} className="mr-1.5 mb-1.5">
                    <TagChip tag={tag} />
                  </View>
                ))}
              </View>
            )}

            {items.length > 0 && (
              <View className="bg-white rounded-2xl border border-line p-4 mb-5">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em]">
                    action items
                  </Text>
                  <Text className="font-mono text-[10px] text-flareDeep">
                    {doneCount}/{items.length}
                  </Text>
                </View>
                {items.map((item, i) => (
                  <Checkbox key={i} item={item} onToggle={() => toggle(i)} />
                ))}
                {saveError && (
                  <Text className="font-body text-xs text-peachDeep mt-1">
                    {saveError}
                  </Text>
                )}
              </View>
            )}

            <MarkdownView text={body} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
