import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

export const DRAWING_WIDTH = 900;
export const DRAWING_HEIGHT = 1200;

const COLORS = ["#101828", "#635BFF", "#2563EB", "#DC2626"];
const WIDTHS = [5, 12, 20];
const PAPER_OPTIONS = [
  { key: "lined", label: "Lined" },
  { key: "grid", label: "Grid" },
  { key: "dotted", label: "Dotted" },
  { key: "blank", label: "Blank" },
];
const ERASER_RADIUS = 34;

function Paper({ style = "lined", width = DRAWING_WIDTH, height = DRAWING_HEIGHT }) {
  const horizontalLines = Array.from({ length: Math.floor(height / 100) }, (_, index) => (index + 1) * 100);
  const verticalLines = Array.from({ length: Math.floor(width / 100) }, (_, index) => (index + 1) * 100);
  const dots = [];
  if (style === "dotted") {
    for (let y = 50; y < height; y += 50) {
      for (let x = 50; x < width; x += 50) dots.push([x, y]);
    }
  }

  return (
    <>
      <Rect x="0" y="0" width={width} height={height} fill="#FFFEFC" />
      {(style === "lined" || style === "grid") && horizontalLines.map((y) => (
        <Line key={`h-${y}`} x1="0" y1={y} x2={width} y2={y} stroke="#E4E7EC" strokeWidth="2" />
      ))}
      {style === "grid" && verticalLines.map((x) => (
        <Line key={`v-${x}`} x1={x} y1="0" x2={x} y2={height} stroke="#EEF0F3" strokeWidth="2" />
      ))}
      {style === "dotted" && dots.map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#D0D5DD" />
      ))}
      {style !== "blank" && <Line x1="78" y1="0" x2="78" y2={height} stroke="#F4B9C2" strokeWidth="2" />}
    </>
  );
}

function pointPath(points = []) {
  if (!points.length) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.01} ${y + 0.01}`;
  }
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    path += ` Q ${current[0]} ${current[1]} ${(current[0] + next[0]) / 2} ${(current[1] + next[1]) / 2}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last[0]} ${last[1]}`;
}

function interpolatePoints(from, to, spacing = 5) {
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.max(1, Math.ceil(distance / spacing));
  return Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / steps;
    return [from[0] + ((to[0] - from[0]) * ratio), from[1] + ((to[1] - from[1]) * ratio)];
  });
}

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const progress = Math.max(0, Math.min(1, (((point[0] - start[0]) * dx) + ((point[1] - start[1]) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(point[0] - (start[0] + (progress * dx)), point[1] - (start[1] + (progress * dy)));
}

function strokeTouchesPoint(stroke, point) {
  const points = stroke.points || [];
  if (points.length === 1) return Math.hypot(point[0] - points[0][0], point[1] - points[0][1]) <= ERASER_RADIUS;
  for (let index = 1; index < points.length; index += 1) {
    if (distanceToSegment(point, points[index - 1], points[index]) <= ERASER_RADIUS) return true;
  }
  return false;
}

export function DrawingPreview({ drawing, height = 220, showPaper = true }) {
  if (!drawing?.strokes?.length) return null;
  const width = drawing.width || DRAWING_WIDTH;
  const drawingHeight = drawing.height || DRAWING_HEIGHT;
  return (
    <View className="overflow-hidden rounded-xl bg-white" style={{ height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${drawingHeight}`}>
        {showPaper && <Paper style={drawing.paper || "lined"} width={width} height={drawingHeight} />}
        {(drawing.strokes || []).map((stroke, index) => (
          <Path key={`${index}-${stroke.points?.length || 0}`} d={pointPath(stroke.points)} stroke={stroke.color || "#101828"} strokeWidth={stroke.width || 12} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}

export function HandwritingCanvas({ strokes, onChange, paperStyle = "lined", onPaperStyleChange, height = 500, disabled = false, active = true }) {
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(WIDTHS[1]);
  const [tool, setToolState] = useState("pen");
  const [undoStack, setUndoStackState] = useState([]);
  const [redoStack, setRedoStackState] = useState([]);
  const strokesRef = useRef(strokes);
  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  const toolRef = useRef(tool);
  const layoutRef = useRef(layout);
  const undoRef = useRef(undoStack);
  const redoRef = useRef(redoStack);
  const gestureRef = useRef(null);
  const lastTapRef = useRef(null);
  const lastPenInputRef = useRef(0);
  const canvasRef = useRef(null);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { widthRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => {
    if (!active || Platform.OS !== "web" || typeof document === "undefined") return undefined;

    const previousBodyUserSelect = document.body.style.userSelect;
    const previousBodyWebkitUserSelect = document.body.style.webkitUserSelect;
    const previousRootUserSelect = document.documentElement.style.userSelect;
    const previousRootWebkitUserSelect = document.documentElement.style.webkitUserSelect;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.documentElement.style.userSelect = "none";
    document.documentElement.style.webkitUserSelect = "none";

    const preventSelection = (event) => event.preventDefault();
    const preventCanvasGesture = (event) => {
      if (canvasRef.current?.contains?.(event.target)) event.preventDefault();
    };
    document.addEventListener("selectstart", preventSelection, { passive: false });
    document.addEventListener("dragstart", preventSelection, { passive: false });
    document.addEventListener("contextmenu", preventCanvasGesture, { passive: false });
    document.addEventListener("touchstart", preventCanvasGesture, { passive: false });
    document.addEventListener("touchmove", preventCanvasGesture, { passive: false });

    return () => {
      document.body.style.userSelect = previousBodyUserSelect;
      document.body.style.webkitUserSelect = previousBodyWebkitUserSelect;
      document.documentElement.style.userSelect = previousRootUserSelect;
      document.documentElement.style.webkitUserSelect = previousRootWebkitUserSelect;
      document.removeEventListener("selectstart", preventSelection);
      document.removeEventListener("dragstart", preventSelection);
      document.removeEventListener("contextmenu", preventCanvasGesture);
      document.removeEventListener("touchstart", preventCanvasGesture);
      document.removeEventListener("touchmove", preventCanvasGesture);
    };
  }, [active]);

  const setStrokes = (next) => { strokesRef.current = next; onChange(next); };
  const setUndoStack = (next) => { undoRef.current = next; setUndoStackState(next); };
  const setRedoStack = (next) => { redoRef.current = next; setRedoStackState(next); };
  const setTool = (next) => { toolRef.current = next; setToolState(next); };
  const rememberState = (snapshot) => { setUndoStack([...undoRef.current, snapshot].slice(-40)); setRedoStack([]); };

  const normalizedPoint = (event) => {
    const { locationX = 0, locationY = 0 } = event.nativeEvent;
    return [
      Math.max(0, Math.min(DRAWING_WIDTH, (locationX / layoutRef.current.width) * DRAWING_WIDTH)),
      Math.max(0, Math.min(DRAWING_HEIGHT, (locationY / layoutRef.current.height) * DRAWING_HEIGHT)),
    ];
  };

  const inputKind = (event) => event.nativeEvent.pointerType || event.nativeEvent.touchType || "touch";
  const shouldCapture = (event) => {
    if (disabled) return false;
    const kind = inputKind(event);
    if (kind === "pen" || kind === "stylus") lastPenInputRef.current = Date.now();
    const touchCount = event.nativeEvent.touches?.length || 1;
    return !(kind === "touch" && (touchCount > 1 || Date.now() - lastPenInputRef.current < 700));
  };

  const eraseAt = (point) => {
    const current = strokesRef.current;
    const next = current.filter((stroke) => !strokeTouchesPoint(stroke, point));
    if (next.length !== current.length) setStrokes(next);
  };

  const startGesture = (event) => {
    const point = normalizedPoint(event);
    const now = Date.now();
    const previousTap = lastTapRef.current;
    if (previousTap && now - previousTap.time < 330 && Math.hypot(point[0] - previousTap.point[0], point[1] - previousTap.point[1]) < 65) {
      setStrokes(previousTap.snapshot);
      setUndoStack(undoRef.current.slice(0, -1));
      setRedoStack([]);
      setTool(toolRef.current === "pen" ? "eraser" : "pen");
      lastTapRef.current = null;
      gestureRef.current = { ignore: true };
      return;
    }
    const snapshot = strokesRef.current;
    rememberState(snapshot);
    gestureRef.current = { start: point, ignore: false };
    lastTapRef.current = { time: now, point, snapshot };
    if (toolRef.current === "eraser") eraseAt(point);
    else setStrokes([...snapshot, { color: colorRef.current, width: widthRef.current, points: [point] }]);
  };

  const moveGesture = (event) => {
    if (gestureRef.current?.ignore) return;
    const point = normalizedPoint(event);
    if (gestureRef.current?.start && Math.hypot(point[0] - gestureRef.current.start[0], point[1] - gestureRef.current.start[1]) > 24) lastTapRef.current = null;
    if (toolRef.current === "eraser") { eraseAt(point); return; }
    const current = strokesRef.current;
    if (!current.length) return;
    const active = current[current.length - 1];
    const previous = active.points[active.points.length - 1];
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 1.5) return;
    setStrokes([...current.slice(0, -1), { ...active, points: [...active.points, ...interpolatePoints(previous, point)] }]);
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: shouldCapture,
    onMoveShouldSetPanResponderCapture: shouldCapture,
    onStartShouldSetPanResponder: shouldCapture,
    onMoveShouldSetPanResponder: shouldCapture,
    onPanResponderGrant: startGesture,
    onPanResponderMove: moveGesture,
    onPanResponderRelease: () => { gestureRef.current = null; },
    onPanResponderTerminate: () => { gestureRef.current = null; },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [disabled, onChange]);

  const undo = () => {
    if (!undoRef.current.length) return;
    const previous = undoRef.current[undoRef.current.length - 1];
    setRedoStack([...redoRef.current, strokesRef.current].slice(-40));
    setUndoStack(undoRef.current.slice(0, -1));
    setStrokes(previous);
  };
  const redo = () => {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    setUndoStack([...undoRef.current, strokesRef.current].slice(-40));
    setRedoStack(redoRef.current.slice(0, -1));
    setStrokes(next);
  };
  const clear = () => {
    if (!strokesRef.current.length) return;
    rememberState(strokesRef.current);
    setStrokes([]);
  };

  const selectionBlock = Platform.OS === "web" ? { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } : undefined;
  return (
    <View style={selectionBlock}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {[
            { key: "pen", label: "Pen", icon: "pencil-outline" },
            { key: "eraser", label: "Eraser", icon: "remove-circle-outline" },
          ].map((item) => (
            <TouchableOpacity key={item.key} onPress={() => setTool(item.key)} accessibilityLabel={`Use ${item.label.toLowerCase()}`} className={`h-9 px-3 rounded-lg flex-row items-center mr-2 border ${tool === item.key ? "bg-flareSoft border-flare" : "bg-white border-line"}`}>
              <Ionicons name={item.icon} size={16} color={tool === item.key ? "#4F46E5" : "#667085"} />
              <Text selectable={false} className={`font-bodyMed text-xs ml-1.5 ${tool === item.key ? "text-flareDeep" : "text-inkfaint"}`}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={undo} disabled={!undoStack.length} accessibilityLabel="Undo change" className="w-9 h-9 items-center justify-center rounded-lg bg-white border border-line mr-1">
            <Ionicons name="arrow-undo-outline" size={18} color={undoStack.length ? "#344054" : "#D0D5DD"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!redoStack.length} accessibilityLabel="Redo change" className="w-9 h-9 items-center justify-center rounded-lg bg-white border border-line">
            <Ionicons name="arrow-redo-outline" size={18} color={redoStack.length ? "#344054" : "#D0D5DD"} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {COLORS.map((item) => (
            <TouchableOpacity key={item} onPress={() => { setColor(item); setTool("pen"); }} accessibilityLabel={`Use ${item} ink`} className={`w-8 h-8 rounded-full mr-2 items-center justify-center ${tool === "pen" && color === item ? "border-2 border-flare" : "border border-line"}`}>
              <View className="w-5 h-5 rounded-full" style={{ backgroundColor: item }} />
            </TouchableOpacity>
          ))}
        </View>
        <Text selectable={false} className="font-body text-[10px] text-inkfaint">Double-tap page to switch tools</Text>
      </View>

      <View className="flex-row flex-wrap items-center mb-3">
        <Text selectable={false} className="font-bodyMed text-[11px] text-inkfaint mr-2">Paper</Text>
        {PAPER_OPTIONS.map((option) => (
          <TouchableOpacity key={option.key} onPress={() => onPaperStyleChange?.(option.key)} accessibilityLabel={`Use ${option.label.toLowerCase()} paper`} className={`h-8 px-3 rounded-lg items-center justify-center mr-1.5 ${paperStyle === option.key ? "bg-flareSoft border border-flare" : "bg-white border border-line"}`}>
            <Text selectable={false} className={`font-bodyMed text-[11px] ${paperStyle === option.key ? "text-flareDeep" : "text-inkfaint"}`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        ref={canvasRef}
        {...responder.panHandlers}
        onLayout={(event) => setLayout(event.nativeEvent.layout)}
        accessibilityLabel="Handwriting canvas"
        className="border border-lineStrong rounded-2xl overflow-hidden bg-white"
        style={{
          height,
          width: "100%",
          maxWidth: height * (DRAWING_WIDTH / DRAWING_HEIGHT),
          alignSelf: "center",
          shadowColor: "#101828",
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          ...(Platform.OS === "web" ? { touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", overscrollBehavior: "none" } : {}),
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
          pointerEvents="none"
          style={Platform.OS === "web" ? { pointerEvents: "none", userSelect: "none", WebkitUserSelect: "none" } : undefined}
        >
          <Paper style={paperStyle} />
          {strokes.map((stroke, index) => (
            <Path key={`${index}-${stroke.points.length}`} d={pointPath(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        {tool === "pen" ? (
          <View className="flex-row items-center">
            {WIDTHS.map((item, index) => (
              <TouchableOpacity key={item} onPress={() => setStrokeWidth(item)} accessibilityLabel={`Use ${["fine", "regular", "marker"][index]} pen`} className={`h-9 px-3 rounded-lg flex-row items-center mr-2 ${strokeWidth === item ? "bg-flareSoft" : "bg-white border border-line"}`}>
                <View className="rounded-full bg-ink mr-2" style={{ width: Math.max(4, item / 2), height: Math.max(4, item / 2) }} />
                <Text selectable={false} className={`font-bodyMed text-xs ${strokeWidth === item ? "text-flareDeep" : "text-inkfaint"}`}>{["Fine", "Pen", "Marker"][index]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="h-9 px-3 rounded-lg bg-flareSoft flex-row items-center justify-center">
            <Ionicons name="information-circle-outline" size={15} color="#4F46E5" />
            <Text selectable={false} className="font-bodyMed text-[11px] text-flareDeep ml-1.5">Stroke eraser</Text>
          </View>
        )}
        <TouchableOpacity onPress={clear} disabled={!strokes.length} className="h-9 px-3 items-center justify-center">
          <Text selectable={false} className={`font-bodyMed text-xs ${strokes.length ? "text-danger" : "text-inkfaint"}`}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
