import React from "react";
import { View, Text } from "react-native";
import { TagChip } from "./TagChip";

function StatCard({ label, value, accent }) {
  return (
    <View
      className="bg-white rounded-3xl border border-line p-5 mb-4 mr-4 flex-1 shadow-sm"
      style={{ minWidth: 150 }}
    >
      <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.12em] mb-2">
        {label}
      </Text>
      <Text className={`font-display text-4xl ${accent || "text-ink"}`}>{value}</Text>
    </View>
  );
}

export function Dashboard({ stats, loading, recentNotes, onOpenNote }) {
  return (
    <View>
      <Text className="font-display text-2xl text-ink mb-1">Overview</Text>
      <Text className="font-body text-sm text-inkfaint mb-6">
        A snapshot of everything your crew has processed.
      </Text>

      {loading || !stats ? (
        <View className="flex-row flex-wrap">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className="bg-line/50 rounded-3xl p-5 mb-4 mr-4 flex-1 h-28"
              style={{ minWidth: 150 }}
            />
          ))}
        </View>
      ) : (
        <>
          <View className="flex-row flex-wrap -mr-4">
            <StatCard label="Total notes" value={stats.total_notes} />
            <StatCard
              label="Open tasks"
              value={stats.open_action_items}
              accent="text-flareDeep"
            />
            <StatCard
              label="Done tasks"
              value={stats.done_action_items}
              accent="text-sageDeep"
            />
            <StatCard label="This week" value={stats.notes_this_week} />
          </View>

          {stats.top_tags && stats.top_tags.length > 0 && (
            <View className="bg-white rounded-3xl border border-line p-5 mb-4">
              <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.12em] mb-3">
                top topics
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {stats.top_tags.map((t) => (
                  <View key={t.tag} className="flex-row items-center mr-3 mb-2">
                    <TagChip tag={t.tag} />
                    <Text className="font-body text-xs text-inkfaint ml-1.5">
                      {t.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {recentNotes && recentNotes.length > 0 && (
            <View className="bg-white rounded-3xl border border-line p-5">
              <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.12em] mb-3">
                recent activity
              </Text>
              {recentNotes.slice(0, 5).map((note) => (
                <Text
                  key={note.id}
                  onPress={() => onOpenNote(note)}
                  className="font-body text-sm text-ink py-2 border-b border-line/60"
                  numberOfLines={1}
                >
                  {note.raw}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
