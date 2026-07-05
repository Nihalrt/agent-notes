import React from "react";
import { View } from "react-native";

// Placeholder cards shown while notes load, so the grid doesn't pop in.
export function NoteSkeleton({ widthPct }) {
  return (
    <View
      className="bg-white/60 border border-line rounded-3xl p-5 mb-4"
      style={{ width: widthPct }}
    >
      <View className="h-2.5 w-24 rounded-full bg-line mb-4" />
      <View className="h-2 w-full rounded-full bg-line mb-2" />
      <View className="h-2 w-full rounded-full bg-line mb-2" />
      <View className="h-2 w-2/3 rounded-full bg-line mb-4" />
      <View className="flex-row">
        <View className="h-4 w-12 rounded-full bg-line mr-2" />
        <View className="h-4 w-12 rounded-full bg-line" />
      </View>
    </View>
  );
}
