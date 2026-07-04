import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";

export function ConfirmDialog({ visible, title, message, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 bg-black/30 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-white rounded-3xl border border-line p-5">
          <Text className="font-displayMed text-base text-ink mb-1">{title}</Text>
          <Text className="font-body text-sm text-inkfaint mb-5">{message}</Text>
          <View className="flex-row justify-end">
            <TouchableOpacity onPress={onCancel} className="px-4 py-2.5 mr-2">
              <Text className="font-bodyMed text-sm text-inkfaint">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="bg-peachDeep rounded-2xl px-4 py-2.5"
            >
              <Text className="font-bodyMed text-sm text-white">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
