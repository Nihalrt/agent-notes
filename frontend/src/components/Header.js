import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export function Header({ search, onSearchChange, onNewNote, showNewButton, connected }) {
  return (
    <View className="flex-row items-center px-5 md:px-8 py-4 border-b border-line bg-paper">
      <View className="flex-1 flex-row items-center bg-white border border-line rounded-2xl px-3.5 h-10">
        <Text className="text-inkfaint mr-2">⌕</Text>
        <TextInput
          className="flex-1 font-body text-sm text-ink h-10"
          placeholder="Search your notes…"
          placeholderTextColor="#B4AFA6"
          value={search}
          onChangeText={onSearchChange}
        />
      </View>

      {showNewButton && (
        <TouchableOpacity
          onPress={onNewNote}
          className="ml-3 bg-flare rounded-2xl px-4 h-10 items-center justify-center flex-row"
        >
          <Text className="font-bodyMed text-white text-sm">+ New Note</Text>
        </TouchableOpacity>
      )}

      {!showNewButton && (
        <View
          className={`ml-3 w-2.5 h-2.5 rounded-full ${
            connected ? "bg-sageDeep" : "bg-peachDeep"
          }`}
        />
      )}
    </View>
  );
}
