import "./global.css";
import React, { useEffect, useMemo, useState, useCallback } from "react";
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

import { fetchNotes, deleteNote, checkHealth, fetchStats } from "./src/api";
import { CARD_COLORS, DESKTOP_BREAKPOINT } from "./src/constants";
import { Sidebar } from "./src/components/Sidebar";
import { Header } from "./src/components/Header";
import { BottomNav } from "./src/components/BottomNav";
import { NoteCard } from "./src/components/NoteCard";
import { NoteSkeleton } from "./src/components/NoteSkeleton";
import { NoteDetailModal } from "./src/components/NoteDetailModal";
import { ComposeSheet } from "./src/components/ComposeSheet";
import { ConfirmDialog } from "./src/components/ConfirmDialog";
import { Dashboard } from "./src/components/Dashboard";

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
  const [stats, setStats] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [connected, setConnected] = useState(true);
  const [view, setView] = useState("notes"); // "overview" | "notes"
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const refreshStats = useCallback(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNotes()
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled)
          setLoadError("Couldn't load your note history from the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoadingNotes(false);
      });

    refreshStats();

    const pingHealth = () =>
      checkHealth().then((ok) => !cancelled && setConnected(ok));
    pingHealth();
    const interval = setInterval(pingHealth, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshStats]);

  // Distinct tags across all notes, sorted, for the sidebar filter.
  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeTag && !(n.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      return (
        n.raw.toLowerCase().includes(q) ||
        n.processed.toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.includes(q))
      );
    });
  }, [notes, search, activeTag]);

  const handleCreated = (note) => {
    setNotes((prev) => [note, ...prev]);
    refreshStats();
  };

  const handleNoteUpdated = (updated) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur));
    refreshStats();
  };

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    try {
      await deleteNote(id);
      refreshStats();
    } catch (e) {
      setNotes(prev);
      setDeleteError("The backend didn't accept the delete. Try again.");
    }
  };

  const selectView = (v) => {
    setView(v);
    if (v === "notes") setActiveTag(null);
  };

  const selectTag = (tag) => {
    setActiveTag(tag);
    setView("notes");
  };

  const openNote = (note) => setSelected(note);

  if (!fontsLoaded) return null;

  const cardWidth = isDesktop ? "31.5%" : "48%";

  const notesView = (
    <>
      {(activeTag || search) && (
        <View className="flex-row items-center mb-4">
          <Text className="font-body text-sm text-inkfaint">
            {filteredNotes.length} note{filteredNotes.length === 1 ? "" : "s"}
            {activeTag ? ` tagged #${activeTag}` : ""}
            {search ? ` matching "${search}"` : ""}
          </Text>
          {activeTag && (
            <Text
              onPress={() => setActiveTag(null)}
              className="font-bodyMed text-sm text-flareDeep ml-3"
            >
              Clear
            </Text>
          )}
        </View>
      )}

      {loadingNotes ? (
        <View className="flex-row flex-wrap justify-between w-full min-w-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <NoteSkeleton key={i} widthPct={cardWidth} />
          ))}
        </View>
      ) : filteredNotes.length === 0 ? (
        <View className="border border-dashed border-line rounded-3xl p-10 items-center">
          <Text className="font-display text-base text-ink mb-1">
            {notes.length === 0 ? "No notes yet" : "Nothing here"}
          </Text>
          <Text className="font-body text-sm text-inkfaint text-center">
            {notes.length === 0
              ? "Tap “New Note” and your crew will extract tasks, tag it, and draft it up here."
              : "No notes match this filter. Try clearing the search or tag."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between w-full min-w-0">
          {filteredNotes.map((note, i) => (
            <NoteCard
              key={note.id}
              note={note}
              color={CARD_COLORS[i % CARD_COLORS.length]}
              onPress={() => openNote(note)}
              onRequestDelete={setPendingDeleteId}
              widthPct={cardWidth}
            />
          ))}
        </View>
      )}
    </>
  );

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

      {view === "overview" ? (
        <Dashboard
          stats={stats}
          loading={loadingNotes}
          recentNotes={notes}
          onOpenNote={(n) => {
            setView("notes");
            openNote(n);
          }}
        />
      ) : (
        notesView
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView className="bg-paper" style={{ width, height }}>
      <StatusBar barStyle="dark-content" />

      {isDesktop ? (
        <View className="flex-1 flex-row min-w-0">
          <Sidebar
            view={view}
            onSelectView={selectView}
            noteCount={notes.length}
            connected={connected}
            tags={allTags}
            activeTag={activeTag}
            onSelectTag={selectTag}
          />
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
          <BottomNav
            view={view}
            onSelectView={selectView}
            noteCount={notes.length}
            onNewNote={() => setComposing(true)}
          />
        </View>
      )}

      <ComposeSheet
        visible={composing}
        onClose={() => setComposing(false)}
        onCreated={handleCreated}
      />
      <NoteDetailModal
        note={selected}
        onClose={() => setSelected(null)}
        onNoteUpdated={handleNoteUpdated}
      />
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
