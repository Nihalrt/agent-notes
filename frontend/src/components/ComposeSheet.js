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
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createDrawingNote, processNote } from "../api";
import { DRAWING_HEIGHT, DRAWING_WIDTH, HandwritingCanvas } from "./HandwritingCanvas";

const PROCESSING_STAGES = [
  "Creating a clear summary",
  "Organizing action items",
  "Checking related notes",
];
const DRAWING_PROCESSING_STAGES = [
  "Reading your handwriting",
  "Creating a clear summary",
  "Checking related notes",
];

export function ComposeSheet({ visible, initialMode = "type", onClose, onCreated }) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState(initialMode);
  const [draft, setDraft] = useState("");
  const [drawingTitle, setDrawingTitle] = useState("");
  const [strokes, setStrokes] = useState([]);
  const [paperStyle, setPaperStyle] = useState("lined");
  const [drawingExpanded, setDrawingExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => timer.current && clearInterval(timer.current), []);
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setDrawingExpanded(false);
    }
  }, [visible, initialMode]);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (loading || (mode === "type" ? !draft.trim() : !strokes.length)) return;
    setLoading(true);
    setError(null);
    setStage(0);
    const activeStages = mode === "type" ? PROCESSING_STAGES : DRAWING_PROCESSING_STAGES;
    timer.current = setInterval(() => setStage((current) => (current + 1) % activeStages.length), 1800);
    try {
      const note = mode === "type"
        ? await processNote(draft.trim())
        : await createDrawingNote(drawingTitle.trim() || "Untitled sketch", {
          width: DRAWING_WIDTH,
          height: DRAWING_HEIGHT,
          paper: paperStyle,
          strokes,
        });
      onCreated(note);
      setDraft("");
      setDrawingTitle("");
      setStrokes([]);
      setPaperStyle("lined");
      setDrawingExpanded(false);
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || `We could not ${mode === "type" ? "process this note" : "save this drawing"}. Please try again.`);
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setLoading(false);
    }
  };

  const availableCanvasWidth = drawingExpanded
    ? screenWidth - (screenWidth >= 768 ? 64 : 24)
    : Math.min(screenWidth - 40, 624);
  const canvasHeight = drawingExpanded
    ? availableCanvasWidth * (DRAWING_HEIGHT / DRAWING_WIDTH)
    : Math.min(screenHeight < 760 ? 380 : 560, availableCanvasWidth * (DRAWING_HEIGHT / DRAWING_WIDTH));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          className={`flex-1 items-center ${drawingExpanded ? "bg-canvas" : "bg-black/40 justify-end md:justify-center md:px-6"}`}
          style={drawingExpanded && Platform.OS === "web" ? { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", overscrollBehavior: "none" } : undefined}
        >
          <View
            className={`w-full overflow-hidden ${drawingExpanded ? "h-full bg-canvas" : "max-w-2xl bg-white rounded-t-3xl md:rounded-3xl border border-line"}`}
            style={{ maxHeight: drawingExpanded ? screenHeight : screenHeight * 0.96 }}
          >
            <View className={`px-5 md:px-6 flex-row items-start justify-between border-b border-line bg-white ${drawingExpanded ? "pt-4 pb-3" : "pt-5 pb-4"}`}>
              <View className="flex-1 mr-4">
                <Text className="font-display text-xl text-ink">{drawingExpanded ? "Drawing workspace" : "Create a note"}</Text>
                {!drawingExpanded && <Text className="font-body text-sm text-inkfaint mt-1">Type an update or capture an idea by hand.</Text>}
              </View>
              {drawingExpanded && (
                <TouchableOpacity
                  onPress={() => setDrawingExpanded(false)}
                  accessibilityLabel="Minimize drawing workspace"
                  className="h-9 px-3 rounded-lg bg-flareSoft flex-row items-center justify-center mr-2"
                >
                  <Ionicons name="contract-outline" size={16} color="#4F46E5" />
                  <Text selectable={false} className="font-bodyMed text-xs text-flareDeep ml-1.5">Minimize</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleClose} disabled={loading} accessibilityLabel="Close" className="w-9 h-9 rounded-xl bg-canvas items-center justify-center">
                <Ionicons name="close" size={20} color="#667085" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className={drawingExpanded ? "px-3 md:px-8" : "px-5 md:px-6"}
              contentContainerStyle={{ paddingVertical: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!drawingExpanded && <View className="bg-canvas rounded-xl p-1 flex-row mb-5">
                {[
                  { key: "type", label: "Type", icon: "text-outline" },
                  { key: "draw", label: "Draw", icon: "pencil-outline" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      if (!loading) {
                        setMode(item.key);
                        if (item.key === "type") setDrawingExpanded(false);
                      }
                    }}
                    className={`flex-1 h-10 rounded-lg flex-row items-center justify-center ${mode === item.key ? "bg-white" : ""}`}
                    style={mode === item.key ? { shadowColor: "#101828", shadowOpacity: 0.06, shadowRadius: 4 } : undefined}
                  >
                    <Ionicons name={item.icon} size={17} color={mode === item.key ? "#4F46E5" : "#667085"} />
                    <Text className={`font-bodyMed text-sm ml-2 ${mode === item.key ? "text-flareDeep" : "text-inkfaint"}`}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>}

              {mode === "type" ? (
                <View>
                  <Text className="font-bodyMed text-xs text-ink mb-2">Note content</Text>
                  <View className="bg-canvas border border-line rounded-2xl p-4">
                    <TextInput
                      className="font-body text-base text-ink h-36"
                      multiline
                      autoFocus={visible && mode === "type"}
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
                </View>
              ) : (
                <View>
                  {!drawingExpanded && (
                    <View>
                      <Text className="font-bodyMed text-xs text-ink mb-2">Drawing title</Text>
                      <TextInput
                        value={drawingTitle}
                        onChangeText={setDrawingTitle}
                        editable={!loading}
                        maxLength={120}
                        placeholder="Untitled sketch"
                        placeholderTextColor="#98A2B3"
                        className="h-11 rounded-xl border border-line bg-canvas px-4 font-body text-sm text-ink mb-4"
                      />
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-3">
                          <Text className="font-bodyMed text-xs text-ink">Handwriting</Text>
                          <Text className="font-body text-[11px] text-inkfaint ml-2" numberOfLines={1}>Apple Pencil, stylus, finger, or mouse</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setDrawingExpanded(true)}
                          accessibilityLabel="Open full-screen drawing workspace"
                          className="h-9 px-3 rounded-lg bg-flareSoft flex-row items-center justify-center"
                        >
                          <Ionicons name="expand-outline" size={16} color="#4F46E5" />
                          <Text selectable={false} className="font-bodyMed text-xs text-flareDeep ml-1.5">Full page</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <HandwritingCanvas
                    key={visible ? "open-canvas" : "closed-canvas"}
                    strokes={strokes}
                    onChange={setStrokes}
                    paperStyle={paperStyle}
                    onPaperStyleChange={setPaperStyle}
                    disabled={loading}
                    active={visible}
                    height={canvasHeight}
                  />
                </View>
              )}

              {loading && (
                <View className="flex-row items-center bg-flareSoft rounded-xl px-4 py-3 mt-4">
                  <ActivityIndicator size="small" color="#635BFF" />
                  <View className="ml-3">
                    <Text className="font-bodyMed text-sm text-ink">{mode === "type" ? "Organizing your note" : "Reading and organizing your drawing"}</Text>
                    <Text className="font-body text-xs text-inkfaint mt-0.5">{mode === "type" ? PROCESSING_STAGES[stage] : DRAWING_PROCESSING_STAGES[stage]}</Text>
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
                  disabled={(mode === "type" ? !draft.trim() : !strokes.length) || loading}
                  activeOpacity={0.82}
                  className={`h-11 px-5 rounded-xl items-center justify-center flex-row ${(mode === "type" ? !draft.trim() : !strokes.length) || loading ? "bg-line" : "bg-flare"}`}
                >
                  {!loading && <Ionicons name={mode === "type" ? "sparkles-outline" : "save-outline"} size={18} color={(mode === "type" ? draft.trim() : strokes.length) ? "#FFFFFF" : "#98A2B3"} />}
                  <Text className={`font-bodyMed text-sm ml-2 ${(mode === "type" ? draft.trim() : strokes.length) && !loading ? "text-white" : "text-inkfaint"}`}>
                    {loading ? "Saving…" : mode === "type" ? "Create note" : "Save drawing"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
