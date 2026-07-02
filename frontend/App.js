import React, { useState, useRef } from "react";
import "./global.css";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import axios from "axios";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_700Bold,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";

// Point this at your FastAPI backend. On a physical device, swap
// localhost for your Mac's LAN IP, e.g. http://192.168.1.50:8001
const API_URL = "http://localhost:8001/notes/process";

const CARD_COLORS = [
  { bg: "bg-lilac", ink: "text-lilacDeep" },
  { bg: "bg-sage", ink: "text-sageDeep" },
  { bg: "bg-peach", ink: "text-peachDeep" },
  { bg: "bg-sky", ink: "text-skyDeep" },
];

const AGENTS = [
  { key: "extract", label: "Extractor", dot: "bg-peachDeep" },
  { key: "context", label: "Archivist", dot: "bg-skyDeep" },
  { key: "draft", label: "Drafter", dot: "bg-lilacDeep" },
];

function stripMarkdown(text) {
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n{2,}/g, " ")
    .trim();
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    JetBrainsMono_500Medium,
  });

  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const relayTimer = useRef(null);

  const startRelayAnimation = () => {
    let step = 0;
    setActiveAgent(0);
    relayTimer.current = setInterval(() => {
      step += 1;
      setActiveAgent(step % AGENTS.length);
    }, 1400);
  };

  const stopRelayAnimation = () => {
    if (relayTimer.current) clearInterval(relayTimer.current);
    setActiveAgent(-1);
  };

  const handleSend = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError(null);
    startRelayAnimation();
    try {
      const res = await axios.post(API_URL, { content: draft.trim() });
      const { note_id, processed_note } = res.data;
      setNotes((prev) => [
        {
          id: note_id,
          raw: draft.trim(),
          processed: processed_note,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setDraft("");
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "Couldn't reach the crew. Is the backend running on :8001?"
      );
    } finally {
      stopRelayAnimation();
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-5 pt-6"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="font-display text-2xl text-ink tracking-tight">
                RELAY
              </Text>
              <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.2em] mt-1">
                notes, passed through your agents
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
              <Text className="text-paper font-displayMed text-xs">AI</Text>
            </View>
          </View>

          {/* Capture card */}
          <View className="bg-white rounded-3xl border border-line p-5 mb-4">
            <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em] mb-3">
              new dump
            </Text>
            <TextInput
              className="font-body text-base text-ink h-28"
              multiline
              textAlignVertical="top"
              placeholder="Talked to Sarah about the migration issue…"
              placeholderTextColor="#B4AFA6"
              value={draft}
              onChangeText={setDraft}
              editable={!loading}
            />

            {/* Agent relay strip */}
            <View className="flex-row items-center mt-4 mb-4">
              {AGENTS.map((agent, i) => (
                <View key={agent.key} className="flex-row items-center">
                  <View
                    className={`w-2 h-2 rounded-full mr-2 ${agent.dot}`}
                    style={{ opacity: activeAgent === i ? 1 : 0.25 }}
                  />
                  <Text
                    className="font-mono text-[10px] uppercase tracking-[0.1em] mr-4"
                    style={{
                      color: activeAgent === i ? "#1C1B1F" : "#B4AFA6",
                    }}
                  >
                    {agent.label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!draft.trim() || loading}
              className={`rounded-2xl py-3 items-center justify-center flex-row ${
                !draft.trim() || loading ? "bg-line" : "bg-ink"
              }`}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#8A8790" />
                  <Text className="font-bodyMed text-inkfaint ml-2">
                    Relaying…
                  </Text>
                </>
              ) : (
                <Text
                  className={`font-bodyMed ${
                    !draft.trim() ? "text-inkfaint" : "text-paper"
                  }`}
                >
                  Send to the crew
                </Text>
              )}
            </TouchableOpacity>

            {error && (
              <Text className="font-body text-xs text-peachDeep mt-3">
                {error}
              </Text>
            )}
          </View>

          {/* Notes grid */}
          <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em] mb-3 mt-4">
            processed ({notes.length})
          </Text>

          {notes.length === 0 ? (
            <View className="border border-dashed border-line rounded-3xl p-8 items-center">
              <Text className="font-body text-sm text-inkfaint text-center">
                Nothing yet. Send your first note and the crew will draft it
                up here.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {notes.map((note, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                const preview = stripMarkdown(note.processed).slice(0, 130);
                return (
                  <TouchableOpacity
                    key={note.id}
                    onPress={() => setSelected(note)}
                    className={`${color.bg} rounded-3xl p-5 mb-4`}
                    style={{ width: "48%" }}
                  >
                    <Text
                      className={`font-mono text-[10px] uppercase tracking-[0.1em] mb-2 ${color.ink}`}
                    >
                      {note.createdAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      ·{" "}
                      {note.createdAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text
                      className="font-body text-sm text-ink"
                      numberOfLines={5}
                    >
                      {preview}…
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full note modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View className="flex-1 bg-black/30 justify-end">
          <View className="bg-paper rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-display text-lg text-ink">
                Processed note
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text className="font-bodyMed text-inkfaint">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text className="font-body text-sm text-ink leading-6">
                {selected?.processed}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}