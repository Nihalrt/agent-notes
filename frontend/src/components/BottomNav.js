import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ITEMS = [
  { key: "overview", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "notes", label: "Notes", icon: "document-text-outline", activeIcon: "document-text" },
  { key: "tasks", label: "Tasks", icon: "checkmark-circle-outline", activeIcon: "checkmark-circle" },
];

export function BottomNav({ view, onSelectView, onNewNote }) {
  return (
    <View className="flex-row items-center border-t border-line bg-white px-3 pt-2 pb-1">
      {ITEMS.map((item) => {
        const active = view === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onSelectView(item.key)}
            activeOpacity={0.72}
            className="flex-1 items-center py-1"
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={active ? item.activeIcon : item.icon} size={21} color={active ? "#635BFF" : "#98A2B3"} />
            <Text className={`font-bodyMed text-[10px] mt-1 ${active ? "text-flareDeep" : "text-inkfaint"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        onPress={onNewNote}
        activeOpacity={0.82}
        accessibilityLabel="Create a new note"
        className="w-12 h-12 rounded-full bg-flare items-center justify-center mx-3 -mt-5"
        style={{ shadowColor: "#635BFF", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
