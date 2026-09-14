import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tagColor } from "../constants";

const NAV_ITEMS = [
  { key: "overview", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "notes", label: "Notes", icon: "document-text-outline", activeIcon: "document-text" },
  { key: "tasks", label: "Tasks", icon: "checkmark-circle-outline", activeIcon: "checkmark-circle" },
];

function NavItem({ item, active, onPress, badge }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center px-3 py-3 rounded-xl mb-1 ${
        active ? "bg-white/10" : ""
      }`}
    >
      <Ionicons
        name={active ? item.activeIcon : item.icon}
        size={19}
        color={active ? "#FFFFFF" : "#98A2B3"}
      />
      <Text className={`font-bodyMed text-sm ml-3 flex-1 ${active ? "text-white" : "text-shellFaint"}`}>
        {item.label}
      </Text>
      {badge != null && (
        <View className="bg-white/10 rounded-full min-w-6 h-6 px-1.5 items-center justify-center">
          <Text className="font-bodyMed text-[11px] text-shellFaint">{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
export function Sidebar({
  view,
  onSelectView,
  noteCount,
  openTaskCount,
  connected,
  tags,
  activeTag,
  onSelectTag,
}) {
  return (
    <View className="w-64 bg-shell h-full px-4 py-6">
      <View className="flex-row items-center px-2 mb-8">
        <View className="w-10 h-10 rounded-xl bg-flare items-center justify-center mr-3">
          <Text className="font-display text-base text-white">R</Text>
        </View>
        <View>
          <Text className="font-display text-xl text-white tracking-tight">Relay</Text>
          <Text className="font-body text-[11px] text-shellFaint">Knowledge workspace</Text>
        </View>
      </View>

      <Text className="font-bodyMed text-[11px] text-shellFaint uppercase tracking-[0.12em] px-3 mb-2">
        Workspace
      </Text>
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.key}
          item={item}
          active={view === item.key && !activeTag}
          onPress={() => onSelectView(item.key)}
          badge={item.key === "notes" ? noteCount : item.key === "tasks" ? openTaskCount : null}
        />
      ))}

      {tags?.length > 0 && (
        <View className="flex-1 mt-7 min-h-0">
          <Text className="font-bodyMed text-[11px] text-shellFaint uppercase tracking-[0.12em] px-3 mb-2">
            Topics
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {tags.map(({ tag, count }) => {
              const color = tagColor(tag);
              const active = activeTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => onSelectTag(active ? null : tag)}
                  activeOpacity={0.72}
                  className={`flex-row items-center px-3 py-2.5 rounded-xl mb-0.5 ${active ? "bg-white/10" : ""}`}
                >
                  <View className={`w-2 h-2 rounded-full mr-3 ${color.bg}`} />
                  <Text className={`font-body text-xs flex-1 ${active ? "text-white" : "text-shellFaint"}`}>
                    {tag}
                  </Text>
                  <Text className="font-body text-[11px] text-shellFaint">{count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View className="border-t border-shellLine pt-4 mt-4 px-2">
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full mr-2.5 ${connected ? "bg-success" : "bg-danger"}`} />
          <View className="flex-1">
            <Text className="font-bodyMed text-xs text-white">
              {connected ? "Service online" : "Connection unavailable"}
            </Text>
            <Text className="font-body text-[10px] text-shellFaint mt-0.5">
              {connected ? "Your workspace is synced" : "Changes may not be saved"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
