import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function Header({
  title,
  subtitle,
  search,
  onSearchChange,
  onNewNote,
  showSearch = true,
  compact = false,
  connected,
}) {
  const searchField = (
    <View className="flex-row items-center bg-canvas border border-line rounded-xl px-3 h-10">
      <Ionicons name="search-outline" size={18} color="#98A2B3" />
      <TextInput
        className="flex-1 font-body text-sm text-ink h-10 ml-2"
        placeholder="Search notes, tasks, and topics"
        placeholderTextColor="#98A2B3"
        value={search}
        onChangeText={onSearchChange}
        returnKeyType="search"
      />
      {!!search && (
        <TouchableOpacity onPress={() => onSearchChange("")} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={17} color="#98A2B3" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="bg-white border-b border-line px-5 md:px-8 py-4">
      <View className="flex-row items-center">
        <View className="flex-1 min-w-0 mr-3">
          <View className="flex-row items-center">
            {compact && (
              <View className="w-8 h-8 rounded-lg bg-flare items-center justify-center mr-2.5">
                <Text className="font-display text-xs text-white">R</Text>
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="font-display text-xl md:text-2xl text-ink" numberOfLines={1}>{title}</Text>
              {!compact && <Text className="font-body text-xs text-inkfaint mt-0.5">{subtitle}</Text>}
            </View>
          </View>
        </View>

        {!compact && showSearch && <View className="w-72 mr-3">{searchField}</View>}

        {!compact && connected != null && (
          <View className="flex-row items-center mr-3 px-3 h-10 rounded-xl bg-canvas border border-line">
            <View className={`w-2 h-2 rounded-full mr-2 ${connected ? "bg-success" : "bg-danger"}`} />
            <Text className="font-bodyMed text-xs text-inkfaint">{connected ? "Synced" : "Offline"}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onNewNote}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Create a new note"
          className={`${compact ? "w-10 px-0" : "px-4"} h-10 bg-flare rounded-xl items-center justify-center flex-row`}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          {!compact && <Text className="font-bodyMed text-white text-sm ml-1.5">New note</Text>}
        </TouchableOpacity>
      </View>

      {compact && showSearch && <View className="mt-3">{searchField}</View>}
    </View>
  );
}
