import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function ConfirmDialog({ visible, title, message, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-white rounded-2xl border border-line p-6">
          <View className="w-10 h-10 rounded-xl bg-dangerSoft items-center justify-center mb-4">
            <Ionicons name="trash-outline" size={20} color="#B42318" />
          </View>
          <Text className="font-displayMed text-lg text-ink mb-1">{title}</Text>
          <Text className="font-body text-sm text-inkfaint leading-5 mb-6">{message}</Text>
          <View className="flex-row justify-end">
            <TouchableOpacity onPress={onCancel} className="h-10 px-4 rounded-xl border border-line items-center justify-center mr-2">
              <Text className="font-bodyMed text-sm text-ink">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} className="h-10 bg-danger rounded-xl px-4 items-center justify-center">
              <Text className="font-bodyMed text-sm text-white">Delete note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
