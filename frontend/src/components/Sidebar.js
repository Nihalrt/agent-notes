import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { tagColor } from "../constants";

function NavItem({ label, icon, active, onPress, badge }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center px-3 py-2.5 rounded-xl mb-1 ${
        active ? "bg-flare/15 border border-flare/30" : ""
      }`}
    >
      <Text className={`text-base mr-2.5 ${active ? "text-flare" : "text-shellFaint"}`}>
        {icon}
      </Text>
      <Text
        className={`font-bodyMed text-sm flex-1 ${
          active ? "text-paper" : "text-shellFaint"
        }`}
      >
        {label}
      </Text>
      {badge != null && (
        <Text className="font-mono text-[10px] text-shellFaint">{badge}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Sidebar({
  view,
  onSelectView,
  noteCount,
  connected,
  tags,
  activeTag,
  onSelectTag,
}) {
  return (
    <View className="w-64 bg-shell h-full px-4 py-7 justify-between">
      <View className="flex-1">
        <View className="flex-row items-center mb-8 px-1">
          <View className="w-8 h-8 rounded-xl bg-flare items-center justify-center mr-2.5">
            <Text className="font-display text-sm text-white">R</Text>
          </View>
          <View>
            <Text className="font-display text-lg text-paper tracking-tight">
              RELAY
            </Text>
            <Text className="font-mono text-[9px] text-shellFaint uppercase tracking-[0.18em]">
              agent notes
            </Text>
          </View>
        </View>

        <NavItem
          label="Overview"
          icon="◈"
          active={view === "overview"}
          onPress={() => onSelectView("overview")}
        />
        <NavItem
          label="All Notes"
          icon="▤"
          active={view === "notes" && !activeTag}
          onPress={() => onSelectView("notes")}
          badge={noteCount}
        />

        {tags && tags.length > 0 && (
          <>
            <Text className="font-mono text-[9px] text-shellFaint uppercase tracking-[0.18em] mt-6 mb-2 px-1">
              topics
            </Text>
            <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
              {tags.map((tag) => {
                const color = tagColor(tag);
                const active = activeTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => onSelectTag(active ? null : tag)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-3 py-2 rounded-xl mb-0.5 ${
                      active ? "bg-flare/15" : ""
                    }`}
                  >
                    <View className={`w-2 h-2 rounded-full mr-2.5 ${color.bg}`} />
                    <Text
                      className={`font-body text-xs flex-1 ${
                        active ? "text-paper" : "text-shellFaint"
                      }`}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      <View>
        <Text className="font-mono text-[9px] text-shellFaint uppercase tracking-[0.18em] mb-3 px-1">
          your crew
        </Text>
        <View className="flex-row items-center px-1 mb-1">
          <View className="w-1.5 h-1.5 rounded-full mr-2 bg-peachDeep" />
          <View className="w-1.5 h-1.5 rounded-full mr-2 bg-skyDeep" />
          <View className="w-1.5 h-1.5 rounded-full mr-2.5 bg-lilacDeep" />
          <Text className="font-body text-xs text-shellFaint">
            Extractor · Archivist · Drafter
          </Text>
        </View>

        <View className="flex-row items-center mt-4 pt-4 border-t border-shellLine px-1">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              connected ? "bg-sageDeep" : "bg-peachDeep"
            }`}
          />
          <Text className="font-mono text-[10px] text-shellFaint uppercase tracking-[0.1em]">
            {connected ? "backend connected" : "backend offline"}
          </Text>
        </View>
      </View>
    </View>
  );
}
