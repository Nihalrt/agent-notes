import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export function BottomNav({ noteCount, onNewNote }) {
  return (
    <View className="flex-row items-center justify-between px-6 py-3 border-t border-line bg-white">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full bg-flare mr-2" />
        <Text className="font-mono text-[10px] text-ink uppercase tracking-[0.1em]">
          All Notes · {noteCount}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNewNote}
        className="bg-flare rounded-full w-12 h-12 items-center justify-center -mt-8 shadow-sm"
      >
        <Text className="text-white text-2xl leading-6">+</Text>
      </TouchableOpacity>
    </View>
  );
}
