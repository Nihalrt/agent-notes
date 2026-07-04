import "./global.css";
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_700Bold,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";

import { fetchNotes, deleteNote, checkHealth } from "./src/api";
import { CARD_COLORS, DESKTOP_BREAKPOINT } from "./src/constants";
import { Sidebar } from "./src/components/Sidebar";
import { Header } from "./src/components/Header";
import { BottomNav } from "./src/components/BottomNav";
import { NoteCard } from "./src/components/NoteCard";
import { NoteDetailModal } from "./src/components/NoteDetailModal";
import { ComposeSheet } from "./src/components/ComposeSheet";
import { ConfirmDialog } from "./src/components/ConfirmDialog";

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_500Medium,
  });

  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [connected, setConnected] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotes()
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load your note history from the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });

    const pingHealth = () => checkHealth().then((ok) => !cancelled && setConnected(ok));
    pingHealth();
    const interval = setInterval(pingHealth, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.raw.toLowerCase().includes(q) || n.processed.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const handleCreated = (note) => setNotes((prev) => [note, ...prev]);

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    try {
      await deleteNote(id);
    } catch (e) {
      setNotes(prev);
      setDeleteError("The backend didn't accept the delete. Try again.");
    }
  };

  if (!fontsLoaded) return null;

  const content = (
    <ScrollView
      className="flex-1 min-w-0 bg-paper"
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {loadError && (
        <Text className="font-body text-xs text-peachDeep mb-4">{loadError}</Text>
      )}
      {deleteError && (
        <Text className="font-body text-xs text-peachDeep mb-4">{deleteError}</Text>
      )}

      {loadingNotes ? (
        <Text className="font-body text-sm text-inkfaint">Loading your notes…</Text>
      ) : filteredNotes.length === 0 ? (
        <View className="border border-dashed border-line rounded-3xl p-8 items-center">
          <Text className="font-body text-sm text-inkfaint text-center">
            {notes.length === 0
              ? "Nothing yet. Send your first note and the crew will draft it up here."
              : "No notes match your search."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between w-full min-w-0">
          {filteredNotes.map((note, i) => (
            <NoteCard
              key={note.id}
              note={note}
              color={CARD_COLORS[i % CARD_COLORS.length]}
              onPress={() => setSelected(note)}
              onRequestDelete={setPendingDeleteId}
              widthPct={isDesktop ? "31.5%" : "48%"}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView className="bg-paper" style={{ width, height }}>
      <StatusBar barStyle="dark-content" />

      {isDesktop ? (
        <View className="flex-1 flex-row min-w-0">
          <Sidebar noteCount={notes.length} connected={connected} />
          <View className="flex-1 min-w-0">
            <Header
              search={search}
              onSearchChange={setSearch}
              onNewNote={() => setComposing(true)}
              showNewButton
            />
            {content}
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <Header
            search={search}
            onSearchChange={setSearch}
            connected={connected}
            showNewButton={false}
          />
          {content}
          <BottomNav noteCount={notes.length} onNewNote={() => setComposing(true)} />
        </View>
      )}

      <ComposeSheet
        visible={composing}
        onClose={() => setComposing(false)}
        onCreated={handleCreated}
      />
      <NoteDetailModal note={selected} onClose={() => setSelected(null)} />
      <ConfirmDialog
        visible={!!pendingDeleteId}
        title="Delete this note?"
        message="This can't be undone."
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}
