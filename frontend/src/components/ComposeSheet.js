import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AGENTS } from "../constants";
import { processNote } from "../api";

export function ComposeSheet({ visible, onClose, onCreated }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState(-1);
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
      const note = await processNote(draft.trim());
      onCreated(note);
      setDraft("");
      onClose();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={loading ? undefined : onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 bg-black/30 justify-end items-center">
          <View className="w-full max-w-xl bg-white rounded-t-3xl md:rounded-3xl md:mb-8 border border-line p-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em]">
                new dump
              </Text>
              <TouchableOpacity onPress={loading ? undefined : onClose}>
                <Text className="font-bodyMed text-inkfaint">Cancel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              className="font-body text-base text-ink h-28"
              multiline
              autoFocus
              textAlignVertical="top"
              placeholder="Talked to Sarah about the migration issue…"
              placeholderTextColor="#B4AFA6"
              value={draft}
              onChangeText={setDraft}
              editable={!loading}
            />

            {/* Agent relay strip */}
            <View className="flex-row items-center mt-4 mb-4 flex-wrap">
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
                !draft.trim() || loading ? "bg-line" : "bg-flare"
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
                    !draft.trim() ? "text-inkfaint" : "text-white"
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
