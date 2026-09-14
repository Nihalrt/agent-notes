import React from "react";
import { View } from "react-native";

export function NoteSkeleton({ widthPct = "100%" }) {
  return (
    <View className="bg-white rounded-2xl border border-line p-5 mb-4" style={{ width: widthPct }}>
      <View className="w-9 h-9 rounded-xl bg-line mb-5" />
      <View className="h-4 bg-line rounded-md w-3/4 mb-3" />
      <View className="h-3 bg-line rounded-md w-full mb-2" />
      <View className="h-3 bg-line rounded-md w-5/6 mb-8" />
      <View className="h-3 bg-line rounded-md w-1/3" />
    </View>
  );
}
