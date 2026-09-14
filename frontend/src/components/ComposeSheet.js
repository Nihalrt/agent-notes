import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { processNote } from "../api";

const PROCESSING_STAGES = [
  "Creating a clear summary",
  "Organizing action items",
  "Checking related notes",
];

export function ComposeSheet({ visible, onClose, onCreated }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => timer.current && clearInterval(timer.current), []);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    setError(null);
    setStage(0);
    timer.current = setInterval(() => setStage((current) => (current + 1) % PROCESSING_STAGES.length), 1500);
    try {
      const note = await processNote(draft.trim());
      onCreated(note);
      setDraft("");
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "We could not process this note. Please try again.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 bg-black/40 justify-end md:justify-center items-center md:px-6">
          <View className="w-full max-w-2xl bg-white rounded-t-3xl md:rounded-3xl border border-line overflow-hidden">
            <View className="px-5 md:px-6 pt-5 pb-4 flex-row items-start justify-between border-b border-line">
              <View className="flex-1 mr-4">
                <Text className="font-display text-xl text-ink">Create a note</Text>
                <Text className="font-body text-sm text-inkfaint mt-1">Add a meeting update, decision, idea, or follow-up.</Text>
              </View>
              <TouchableOpacity onPress={handleClose} disabled={loading} accessibilityLabel="Close" className="w-9 h-9 rounded-xl bg-canvas items-center justify-center">
                <Ionicons name="close" size={20} color="#667085" />
              </TouchableOpacity>
            </View>

            <View className="p-5 md:p-6">
              <Text className="font-bodyMed text-xs text-ink mb-2">Note content</Text>
              <View className="bg-canvas border border-line rounded-2xl p-4">
                <TextInput
                  className="font-body text-base text-ink h-36"
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  placeholder="Example: Met with the product team. Alex will update the launch plan by Friday…"
                  placeholderTextColor="#98A2B3"
                  value={draft}
                  onChangeText={setDraft}
                  editable={!loading}
                  maxLength={8000}
                />
                <Text className="font-body text-[11px] text-inkfaint text-right mt-2">{draft.length.toLocaleString()} / 8,000</Text>
              </View>

              {loading && (
                <View className="flex-row items-center bg-flareSoft rounded-xl px-4 py-3 mt-4">
                  <ActivityIndicator size="small" color="#635BFF" />
                  <View className="ml-3">
                    <Text className="font-bodyMed text-sm text-ink">Organizing your note</Text>
                    <Text className="font-body text-xs text-inkfaint mt-0.5">{PROCESSING_STAGES[stage]}</Text>
                  </View>
                </View>
              )}

              {!!error && (
                <View className="flex-row items-start bg-dangerSoft rounded-xl px-4 py-3 mt-4">
                  <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
                  <Text className="font-body text-xs text-danger flex-1 ml-2">{error}</Text>
                </View>
              )}

              <View className="flex-row justify-end mt-5">
                <TouchableOpacity onPress={handleClose} disabled={loading} className="h-11 px-4 rounded-xl border border-line items-center justify-center mr-2">
                  <Text className="font-bodyMed text-sm text-ink">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!draft.trim() || loading}
                  activeOpacity={0.82}
                  className={`h-11 px-5 rounded-xl items-center justify-center flex-row ${!draft.trim() || loading ? "bg-line" : "bg-flare"}`}
                >
                  {!loading && <Ionicons name="sparkles-outline" size={18} color={draft.trim() ? "#FFFFFF" : "#98A2B3"} />}
                  <Text className={`font-bodyMed text-sm ml-2 ${draft.trim() && !loading ? "text-white" : "text-inkfaint"}`}>
                    {loading ? "Processing…" : "Create note"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
