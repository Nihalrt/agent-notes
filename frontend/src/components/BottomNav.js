import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

function NavButton({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="items-center px-4"
    >
      <Text className={`text-lg ${active ? "text-flare" : "text-inkfaint"}`}>
        {icon}
      </Text>
      <Text
        className={`font-mono text-[9px] uppercase tracking-[0.1em] mt-0.5 ${
          active ? "text-ink" : "text-inkfaint"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function BottomNav({ view, onSelectView, noteCount, onNewNote }) {
  return (
    <View className="flex-row items-center justify-between px-6 py-2.5 border-t border-line bg-white">
      <NavButton
        label="Overview"
        icon="◈"
        active={view === "overview"}
        onPress={() => onSelectView("overview")}
      />
      <NavButton
        label={`Notes · ${noteCount}`}
        icon="▤"
        active={view === "notes"}
        onPress={() => onSelectView("notes")}
      />

      <TouchableOpacity
        onPress={onNewNote}
        activeOpacity={0.85}
        className="bg-flare rounded-full w-12 h-12 items-center justify-center -mt-8 shadow-sm"
      >
        <Text className="text-white text-2xl leading-6">+</Text>
      </TouchableOpacity>
    </View>
  );
}
