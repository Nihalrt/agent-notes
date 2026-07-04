import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { MarkdownView } from "./MarkdownView";

export function NoteDetailModal({ note, onClose }) {
  return (
    <Modal
      visible={!!note}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/30 justify-end items-center">
        <View className="w-full max-w-2xl bg-paper rounded-t-3xl p-6 max-h-[80%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em]">
              processed note
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="font-bodyMed text-inkfaint">Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <MarkdownView text={note?.processed} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
