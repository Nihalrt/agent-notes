import "./global.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, StatusBar, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { SpaceGrotesk_700Bold, SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";

import { fetchNotes, deleteNote, checkHealth, fetchStats } from "./src/api";
import { DESKTOP_BREAKPOINT, TABLET_BREAKPOINT } from "./src/constants";
import { Sidebar } from "./src/components/Sidebar";
import { Header } from "./src/components/Header";
import { BottomNav } from "./src/components/BottomNav";
import { NoteCard } from "./src/components/NoteCard";
import { NoteSkeleton } from "./src/components/NoteSkeleton";
import { NoteDetailModal } from "./src/components/NoteDetailModal";
import { ComposeSheet } from "./src/components/ComposeSheet";
import { ConfirmDialog } from "./src/components/ConfirmDialog";
import { Dashboard } from "./src/components/Dashboard";
import { TasksView } from "./src/components/TasksView";

const PAGE_COPY = {
  overview: { title: "Home", subtitle: "A clear view of your notes and next steps" },
  notes: { title: "Notes", subtitle: "Search, review, and organize your knowledge" },
  tasks: { title: "Tasks", subtitle: "Track every action item in one place" },
};

function RelayApp() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_500Medium,
  });
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT;

  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const refreshStats = useCallback(() => fetchStats().then(setStats).catch(() => {}), []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedNotes, loadedStats] = await Promise.all([fetchNotes(), fetchStats()]);
      setNotes(loadedNotes);
      setStats(loadedStats);
      setConnected(true);
    } catch {
      setLoadError("Your workspace could not be loaded. Check your connection and try again.");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadWorkspace();
    const ping = () => checkHealth().then((online) => !cancelled && setConnected(online));
    const interval = setInterval(ping, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadWorkspace]);

  const topicCounts = useMemo(() => {
    const counts = {};
    notes.forEach((note) => (note.tags || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (activeTag && !(note.tags || []).includes(activeTag)) return false;
      if (!query) return true;
      return note.raw.toLowerCase().includes(query)
        || note.processed.toLowerCase().includes(query)
        || (note.tags || []).some((tag) => tag.toLowerCase().includes(query))
        || (note.actionItems || []).some((item) => item.text.toLowerCase().includes(query));
    });
  }, [notes, search, activeTag]);

  const openTaskCount = notes.reduce((total, note) => total + (note.actionItems || []).filter((item) => !item.done).length, 0);

  const selectView = (nextView) => {
    setView(nextView);
    setActiveTag(null);
    if (nextView === "overview") setSearch("");
  };

  const selectTag = (tag) => {
    setActiveTag(tag);
    setView("notes");
  };

  const handleCreated = (note) => {
    setNotes((current) => [note, ...current]);
    setView("notes");
    refreshStats();
  };

  const handleNoteUpdated = (updated) => {
    setNotes((current) => current.map((note) => note.id === updated.id ? updated : note));
    setSelected((current) => current?.id === updated.id ? updated : current);
    refreshStats();
  };

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    const previous = notes;
    setPendingDeleteId(null);
    setNotes((current) => current.filter((note) => note.id !== id));
    setDeleteError(null);
    try {
      await deleteNote(id);
      refreshStats();
    } catch {
      setNotes(previous);
      setDeleteError("This note could not be deleted. Please try again.");
    }
  };

  if (!fontsLoaded) return <View className="flex-1 bg-canvas" />;

  const cardWidth = isDesktop ? "32%" : isTablet ? "48.5%" : "100%";
  const page = PAGE_COPY[view];

  const notesContent = loading ? (
    <View className="flex-row flex-wrap justify-between">
      {[0, 1, 2, 3, 4, 5].map((key) => <NoteSkeleton key={key} widthPct={cardWidth} />)}
    </View>
  ) : filteredNotes.length ? (
    <View className="flex-row flex-wrap justify-between">
      {filteredNotes.map((note) => (
        <NoteCard key={note.id} note={note} onPress={() => setSelected(note)} onRequestDelete={setPendingDeleteId} widthPct={cardWidth} />
      ))}
    </View>
  ) : (
    <View className="bg-white border border-line rounded-2xl items-center px-6 py-14">
      <View className="w-12 h-12 rounded-2xl bg-flareSoft items-center justify-center">
        <Ionicons name={notes.length ? "search-outline" : "document-text-outline"} size={24} color="#635BFF" />
      </View>
      <Text className="font-displayMed text-base text-ink mt-4">{notes.length ? "No matching notes" : "Create your first note"}</Text>
      <Text className="font-body text-sm text-inkfaint text-center mt-1 max-w-md">
        {notes.length ? "Try a different search term or clear the selected topic." : "Add an update, meeting note, or decision. Relay will organize it into a summary, topics, and action items."}
      </Text>
      {!notes.length && (
        <TouchableOpacity onPress={() => setComposing(true)} className="bg-flare h-10 px-4 rounded-xl flex-row items-center justify-center mt-5">
          <Ionicons name="add" size={19} color="#FFFFFF" />
          <Text className="font-bodyMed text-sm text-white ml-1.5">Create note</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="bg-canvas" style={{ width, height }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 flex-row min-w-0">
        {isDesktop && (
          <Sidebar
            view={view}
            onSelectView={selectView}
            noteCount={notes.length}
            openTaskCount={openTaskCount}
            connected={connected}
            tags={topicCounts}
            activeTag={activeTag}
            onSelectTag={selectTag}
          />
        )}

        <View className="flex-1 min-w-0">
          <Header
            title={page.title}
            subtitle={activeTag ? `Showing notes tagged “${activeTag}”` : page.subtitle}
            search={search}
            onSearchChange={setSearch}
            onNewNote={() => setComposing(true)}
            showSearch={view !== "overview"}
            compact={!isDesktop}
            connected={connected}
          />

          <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ padding: isDesktop ? 28 : 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {(loadError || deleteError) && (
              <View className="bg-dangerSoft rounded-xl px-4 py-3 mb-4 flex-row items-center">
                <Ionicons name="alert-circle-outline" size={19} color="#B42318" />
                <Text className="font-body text-xs text-danger flex-1 ml-2">{loadError || deleteError}</Text>
                {!!loadError && <TouchableOpacity onPress={loadWorkspace}><Text className="font-bodyMed text-xs text-danger">Retry</Text></TouchableOpacity>}
              </View>
            )}

            {view === "overview" && (
              <Dashboard
                stats={stats}
                loading={loading}
                recentNotes={notes}
                onOpenNote={setSelected}
                onNewNote={() => setComposing(true)}
                onViewTasks={() => selectView("tasks")}
                compact={!isDesktop}
              />
            )}

            {view === "notes" && (
              <View>
                {(activeTag || search) && (
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="font-body text-sm text-inkfaint">{filteredNotes.length} result{filteredNotes.length === 1 ? "" : "s"}</Text>
                    {activeTag && <TouchableOpacity onPress={() => setActiveTag(null)}><Text className="font-bodyMed text-sm text-flareDeep">Clear topic</Text></TouchableOpacity>}
                  </View>
                )}
                {notesContent}
              </View>
            )}

            {view === "tasks" && <TasksView notes={filteredNotes} onNoteUpdated={handleNoteUpdated} onOpenNote={setSelected} />}
          </ScrollView>

          {!isDesktop && <BottomNav view={view} onSelectView={selectView} onNewNote={() => setComposing(true)} />}
        </View>
      </View>

      <ComposeSheet visible={composing} onClose={() => setComposing(false)} onCreated={handleCreated} />
      <NoteDetailModal note={selected} onClose={() => setSelected(null)} onNoteUpdated={handleNoteUpdated} />
      <ConfirmDialog
        visible={!!pendingDeleteId}
        title="Delete this note?"
        message="The note and its action items will be permanently removed."
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><RelayApp /></SafeAreaProvider>;
}
