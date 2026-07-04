import React from "react";
import { View, Text } from "react-native";
import { AGENTS } from "../constants";

export function Sidebar({ noteCount, connected }) {
  return (
    <View className="w-64 bg-shell h-full px-5 py-7 justify-between">
      <View>
        <View className="flex-row items-center mb-8">
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

        <View className="rounded-2xl bg-flare/15 border border-flare/30 px-3.5 py-3 mb-1">
          <Text className="font-mono text-[10px] text-shellFaint uppercase tracking-[0.1em] mb-1">
            all notes
          </Text>
          <Text className="font-display text-2xl text-paper">{noteCount}</Text>
        </View>
      </View>

      <View>
        <Text className="font-mono text-[9px] text-shellFaint uppercase tracking-[0.18em] mb-3">
          your crew
        </Text>
        {AGENTS.map((agent) => (
          <View key={agent.key} className="flex-row items-center mb-2.5">
            <View className={`w-1.5 h-1.5 rounded-full mr-2.5 ${agent.dot}`} />
            <Text className="font-body text-xs text-shellFaint">
              {agent.label}
            </Text>
          </View>
        ))}

        <View className="flex-row items-center mt-4 pt-4 border-t border-shellLine">
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
