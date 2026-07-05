import React from "react";
import { View, Text } from "react-native";

const EMPTY_LINE_PATTERN =
  /^(none\.?|no (relevant )?(action items? )?(identified|found)\.?)$/i;

export function stripMarkdown(text) {
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n{2,}/g, " ")
    .trim();
}

// Pulls just the "Meeting Summary" paragraph out for the card preview,
// instead of a jumbled concatenation of every section.
export function extractSummary(markdown) {
  const match = markdown.match(/#\s*Meeting Summary\s*\n([\s\S]*?)(\n##|\n#|$)/i);
  const summary = match ? match[1].trim() : stripMarkdown(markdown);
  return summary.slice(0, 140);
}

// Removes a `## <heading>` section (up to the next heading) from the markdown.
// Used to drop the "Action Items" block from the detail view, since we render
// that section as an interactive checklist instead of static text.
export function stripSection(markdown, heading) {
  if (!markdown) return markdown;
  const lines = markdown.split("\n");
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      skipping = trimmed.slice(3).trim().toLowerCase() === heading.toLowerCase();
      if (skipping) continue;
    } else if (trimmed.startsWith("# ")) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").trim();
}

// Renders **bold** spans inline within a line of text.
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <Text key={`${keyPrefix}-${idx}`} className="font-bodyMed text-ink">
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={`${keyPrefix}-${idx}`}>{part}</Text>
    )
  );
}

// A small, purpose-built markdown renderer for the fixed structure our
// agents always output (# / ## headers, bullets, bold, plain paragraphs).
export function MarkdownView({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (trimmed === "") return;
    // The LLM sometimes wraps its whole answer in a ```markdown code fence;
    // drop those fence lines so they don't render as literal text.
    if (trimmed.startsWith("```")) return;

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", content: trimmed.slice(3) });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", content: trimmed.slice(2) });
    } else if (/^[-*+]\s+/.test(trimmed)) {
      const indented = /^\s{2,}/.test(rawLine) || rawLine.startsWith("\t");
      blocks.push({
        type: "bullet",
        content: trimmed.replace(/^[-*+]\s+/, ""),
        indent: indented,
      });
    } else if (EMPTY_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "empty", content: trimmed });
    } else {
      blocks.push({ type: "p", content: trimmed });
    }
  });

  return (
    <View>
      {blocks.map((block, idx) => {
        const key = `md-${idx}`;
        if (block.type === "h1") {
          return (
            <Text key={key} className="font-display text-xl text-ink mb-3">
              {block.content}
            </Text>
          );
        }
        if (block.type === "h2") {
          return (
            <Text
              key={key}
              className="font-mono text-[10px] text-inkfaint uppercase tracking-[0.15em] mt-6 mb-2"
            >
              {block.content}
            </Text>
          );
        }
        if (block.type === "bullet") {
          return (
            <View
              key={key}
              className={`flex-row mb-2 ${block.indent ? "pl-5" : ""}`}
            >
              <Text className="text-inkfaint mr-2">•</Text>
              <Text className="font-body text-sm text-ink flex-1 leading-6">
                {renderInline(block.content, key)}
              </Text>
            </View>
          );
        }
        if (block.type === "empty") {
          return (
            <Text
              key={key}
              className="font-body text-sm text-inkfaint italic mb-2"
            >
              {block.content}
            </Text>
          );
        }
        return (
          <Text key={key} className="font-body text-sm text-ink leading-6 mb-2">
            {renderInline(block.content, key)}
          </Text>
        );
      })}
    </View>
  );
}
