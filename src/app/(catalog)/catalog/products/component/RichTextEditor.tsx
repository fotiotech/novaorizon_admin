"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import CharacterCount from "@tiptap/extension-character-count";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  Code as CodeIcon,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  DataObject,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Link as LinkIcon,
  LinkOff,
  Image as ImageIcon,
  Undo,
  Redo,
  HorizontalRule,
  FormatColorFill,
  FormatColorText,
  FormatClear,
  Fullscreen,
  FullscreenExit,
  Subscript as SubIcon,
  Superscript as SupIcon,
} from "@mui/icons-material";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ReactNode,
} from "react";
import { useFileUploader } from "@/hooks/useFileUploader";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  productId: string;
  /** Bounds the scrollable content area. Toolbar stays pinned above it. */
  contentMaxHeight?: number | string;
  /**
   * When true, the editor stretches to fill its parent's height rather
   * than capping at a max. Use inside a flex container whose ancestor
   * provides a concrete height (e.g. a bottom sheet body cell).
   * Takes precedence over `contentMaxHeight`.
   */
  fillContainer?: boolean;
}

// ==================================================================
// Custom extensions — text spacing
// ==================================================================

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (value: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    letterSpacing: {
      setLetterSpacing: (value: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

/**
 * Line height — a global attribute on block nodes (paragraph, heading).
 * Renders as an inline `style="line-height: …"` on the element, so it
 * survives round-trips through the HTML stored in `description`.
 */
const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (value: string) =>
        ({ commands }) =>
          ["paragraph", "heading"].every((type) =>
            commands.updateAttributes(type, { lineHeight: value }),
          ),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          ["paragraph", "heading"].every((type) =>
            commands.resetAttributes(type, "lineHeight"),
          ),
    };
  },
});

/**
 * Letter spacing — a global attribute on the `textStyle` mark. The
 * inline span that TextStyle already wraps around the selection gains
 * a `style="letter-spacing: …"`. Requires TextStyle to be registered.
 */
const LetterSpacing = Extension.create({
  name: "letterSpacing",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (value: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: value }).run(),
      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: null }).run(),
    };
  },
});

// ---- Extensions --------------------------------------------------
const extensions: AnyExtension[] = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false },
  }),
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
  }),
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  Subscript,
  Superscript,
  CharacterCount,
  LineHeight,
  LetterSpacing,
  Image.configure({ inline: false, allowBase64: false }),
  Placeholder.configure({ placeholder: "Write description..." }),
];

// ---- Palettes ----------------------------------------------------
const TEXT_COLORS = [
  "#000000",
  "#374151",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
  "#ffffff",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#65a30d",
  "#16a34a",
  "#0891b2",
  "#0284c7",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
];

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fde68a",
  "#fcd34d",
  "#fdba74",
  "#fca5a5",
  "#f9a8d4",
  "#d8b4fe",
  "#a5b4fc",
  "#93c5fd",
  "#7dd3fc",
  "#6ee7b7",
  "#bbf7d0",
  "#e5e7eb",
  "#ffffff",
];

// Line-height presets.
const LINE_HEIGHTS: { value: string; label: string }[] = [
  { value: "1", label: "1.0" },
  { value: "1.15", label: "1.15" },
  { value: "1.25", label: "1.25" },
  { value: "1.5", label: "1.5" },
  { value: "1.75", label: "1.75" },
  { value: "2", label: "2.0" },
  { value: "2.5", label: "2.5" },
  { value: "3", label: "3.0" },
];

// Letter-spacing presets.
const LETTER_SPACINGS: { value: string; label: string }[] = [
  { value: "-1px", label: "-1px" },
  { value: "-0.5px", label: "-0.5px" },
  { value: "0", label: "0px" },
  { value: "0.5px", label: "0.5px" },
  { value: "1px", label: "1px" },
  { value: "2px", label: "2px" },
];

// ------------------------------------------------------------------
// Shared class for every native <select> in the toolbar.
//
// `[color-scheme:light] dark:[color-scheme:dark]` is the crucial bit:
// Windows Chrome/Edge ignore the element's CSS `color` for the closed
// state of a native <select> and use the OS color scheme instead. This
// class tells the browser to render the control in the light scheme
// when the page is in light mode and the dark scheme in dark mode, so
// the closed-state text and the dropdown list are readable in both.
// ------------------------------------------------------------------
const TOOLBAR_SELECT_CLASS =
  "h-7 shrink-0 rounded border border-border bg-white px-1.5 text-xs text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40 [color-scheme:light] dark:bg-gray-800 dark:text-gray-100 dark:[color-scheme:dark]";

// ---- ToolbarButton -----------------------------------------------
const ToolbarButton = ({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition ${
      active
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    style={{ touchAction: "manipulation" }}
  >
    {children}
  </button>
);

const Divider = () => (
  <span
    className="mx-0.5 inline-block h-5 w-px shrink-0 self-center bg-border"
    aria-hidden="true"
  />
);

// ---- ColorPicker -------------------------------------------------
const ColorPicker = ({
  icon,
  title,
  colors,
  onSelect,
  onClear,
  activeColor,
}: {
  icon: ReactNode;
  title: string;
  colors: string[];
  onSelect: (color: string) => void;
  onClear: () => void;
  activeColor?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-label={title}
        aria-expanded={open}
        className="relative inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
        style={{ touchAction: "manipulation" }}
      >
        {icon}
        {activeColor && (
          <span
            className="pointer-events-none absolute bottom-0.5 left-1 right-1 h-0.5 rounded-full"
            style={{ backgroundColor: activeColor }}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
          <div className="grid grid-cols-6 gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                title={c}
                className="h-5 w-5 rounded border border-border transition hover:scale-110"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="mt-2 w-full rounded border border-border px-2 py-1 text-xs text-foreground transition hover:bg-muted"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ---- SpacingSelect ----------------------------------------------
const SpacingSelect = ({
  title,
  value,
  placeholder,
  options,
  onChange,
  width = "w-[64px]",
}: {
  title: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: string;
}) => (
  <select
    className={`${TOOLBAR_SELECT_CLASS} ${width}`}
    title={title}
    aria-label={title}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onMouseDown={(e) => e.stopPropagation()}
    style={{ touchAction: "manipulation" }}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

// ==================================================================
// Editor
// ==================================================================
const RichTextEditor: React.FC<RichTextEditorProps> = memo(
  ({
    value,
    onChange,
    placeholder,
    productId,
    contentMaxHeight,
    fillContainer,
  }) => {
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showImageAltDialog, setShowImageAltDialog] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [counts, setCounts] = useState({ words: 0, characters: 0 });
    const [, setTick] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const pendingFileRef = useRef<File | null>(null);
    const pendingAltRef = useRef<string>("");
    const onChangeRef = useRef(onChange);
    const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingHtmlRef = useRef<string | null>(null);
    const lastEmittedHtmlRef = useRef(value);

    const { files, addFiles, progressByName } = useFileUploader(
      productId,
      [],
      "editor",
    );

    const insertedUrlsRef = useRef<string[]>([]);

    const wantsFill = fillContainer === true;

    const hasBoundedHeight =
      !wantsFill && contentMaxHeight !== undefined && contentMaxHeight !== null;

    const maxHeightStyle = hasBoundedHeight
      ? typeof contentMaxHeight === "number"
        ? `${contentMaxHeight}px`
        : contentMaxHeight
      : undefined;

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const emitChange = useCallback((html: string) => {
      if (html === lastEmittedHtmlRef.current) return;

      pendingHtmlRef.current = html;
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
      }

      changeTimerRef.current = setTimeout(() => {
        const pendingHtml = pendingHtmlRef.current;
        if (
          pendingHtml !== null &&
          pendingHtml !== lastEmittedHtmlRef.current
        ) {
          lastEmittedHtmlRef.current = pendingHtml;
          onChangeRef.current(pendingHtml);
        }
        changeTimerRef.current = null;
      }, 250);
    }, []);

    useEffect(() => {
      return () => {
        if (changeTimerRef.current) {
          clearTimeout(changeTimerRef.current);
        }
        const pendingHtml = pendingHtmlRef.current;
        if (
          pendingHtml !== null &&
          pendingHtml !== lastEmittedHtmlRef.current
        ) {
          lastEmittedHtmlRef.current = pendingHtml;
          onChangeRef.current(pendingHtml);
        }
      };
    }, []);

    const editor = useEditor({
      extensions,
      content: value,
      onUpdate: ({ editor }) => {
        emitChange(editor.getHTML());
        setCounts({
          words: editor.storage.characterCount.words(),
          characters: editor.storage.characterCount.characters(),
        });
      },
      onSelectionUpdate: () => {
        setTick((n) => n + 1);
      },
      onCreate: ({ editor }) => {
        setCounts({
          words: editor.storage.characterCount.words(),
          characters: editor.storage.characterCount.characters(),
        });
      },
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose max-w-none focus:outline-none min-h-[200px] p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          style: "font-size: 16px; touch-action: manipulation;",
        },
      },
    });

    useEffect(() => {
      if (!editor) return;
      const newUrls = files.filter(
        (url) => !insertedUrlsRef.current.includes(url),
      );
      if (newUrls.length > 0) {
        const url = newUrls[0];
        const alt = pendingAltRef.current || "";
        editor.chain().focus().setImage({ src: url, alt }).run();
        insertedUrlsRef.current = [...insertedUrlsRef.current, url];
        pendingAltRef.current = "";
        setShowImageAltDialog(false);
      }
    }, [files, editor]);

    useEffect(() => {
      const container = editorContainerRef.current;
      if (!container) return;
      const handleTouchStart = (_e: TouchEvent) => {
        /* no-op */
      };
      container.addEventListener("touchstart", handleTouchStart);
      return () =>
        container.removeEventListener("touchstart", handleTouchStart);
    }, []);

    useEffect(() => {
      if (!isFullscreen) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsFullscreen(false);
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }, [isFullscreen]);

    const handleImageUpload = useCallback((file: File) => {
      pendingFileRef.current = file;
      setShowImageAltDialog(true);
    }, []);

    const handleAltConfirm = useCallback(
      (alt: string) => {
        if (pendingFileRef.current) {
          pendingAltRef.current = alt;
          addFiles([pendingFileRef.current]);
          pendingFileRef.current = null;
          setShowImageAltDialog(false);
        } else {
          setShowImageAltDialog(false);
        }
      },
      [addFiles],
    );

    const addLink = useCallback(() => {
      if (!editor) return;
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkDialog(false);
      setLinkUrl("");
    }, [editor, linkUrl]);

    const openLinkDialog = useCallback(() => {
      const currentUrl = editor?.getAttributes("link").href || "";
      setLinkUrl(currentUrl);
      setShowLinkDialog(true);
    }, [editor]);

    if (!editor) {
      return (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
          Loading editor...
        </div>
      );
    }

    const isUploading = Object.values(progressByName).some((p) => p < 100);
    const currentColor =
      (editor.getAttributes("textStyle").color as string) || undefined;
    const currentHighlight =
      (editor.getAttributes("highlight").color as string) || undefined;
    const currentLineHeight = (() => {
      if (editor.isActive("heading")) {
        return (editor.getAttributes("heading").lineHeight as string) || "";
      }
      return (editor.getAttributes("paragraph").lineHeight as string) || "";
    })();
    const currentLetterSpacing =
      (editor.getAttributes("textStyle").letterSpacing as string) || "";
    const showFooter = wantsFill || hasBoundedHeight || isFullscreen;

    return (
      <div
        ref={editorContainerRef}
        className={`flex flex-col overflow-hidden rounded-lg border bg-white dark:bg-gray-800 ${
          wantsFill ? "h-full" : ""
        } ${isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""}`}
        style={
          !isFullscreen && maxHeightStyle
            ? { maxHeight: maxHeightStyle }
            : undefined
        }
      >
        {/* ---------------- Toolbar (pinned) ---------------- */}
        <div className="flex-none border-b border-border bg-gray-50 dark:bg-gray-700">
          <div
            className="
              flex flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden p-1.5
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
              sm:flex-wrap sm:overflow-visible
            "
          >
            {/* Block type */}
            <select
              className={`${TOOLBAR_SELECT_CLASS} w-[88px]`}
              onChange={(e) => {
                const level = parseInt(e.target.value);
                if (level === 0) editor.chain().focus().setParagraph().run();
                else
                  editor
                    .chain()
                    .focus()
                    .setHeading({ level } as any)
                    .run();
              }}
              value={(() => {
                if (editor.isActive("heading", { level: 1 })) return "1";
                if (editor.isActive("heading", { level: 2 })) return "2";
                if (editor.isActive("heading", { level: 3 })) return "3";
                return "0";
              })()}
              style={{ touchAction: "manipulation" }}
            >
              <option value="0">Paragraph</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>

            {/* Line spacing */}
            <SpacingSelect
              title="Line spacing"
              placeholder="Line"
              value={currentLineHeight}
              options={LINE_HEIGHTS}
              width="w-[56px]"
              onChange={(val) => {
                if (!val) editor.chain().focus().unsetLineHeight().run();
                else editor.chain().focus().setLineHeight(val).run();
              }}
            />

            {/* Letter spacing */}
            <SpacingSelect
              title="Letter spacing"
              placeholder="Letter"
              value={currentLetterSpacing}
              options={LETTER_SPACINGS}
              width="w-[68px]"
              onChange={(val) => {
                if (!val) editor.chain().focus().unsetLetterSpacing().run();
                else editor.chain().focus().setLetterSpacing(val).run();
              }}
            />

            <Divider />

            {/* Marks */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <FormatBold fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <FormatItalic fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline (Ctrl+U)"
            >
              <FormatUnderlined fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <StrikethroughS fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
              title="Inline code"
            >
              <CodeIcon fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive("subscript")}
              title="Subscript"
            >
              <SubIcon fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive("superscript")}
              title="Superscript"
            >
              <SupIcon fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* Colors */}
            <ColorPicker
              icon={<FormatColorText fontSize="small" />}
              title="Text color"
              colors={TEXT_COLORS}
              activeColor={currentColor}
              onSelect={(c) => editor.chain().focus().setColor(c).run()}
              onClear={() => editor.chain().focus().unsetColor().run()}
            />
            <ColorPicker
              icon={<FormatColorFill fontSize="small" />}
              title="Highlight"
              colors={HIGHLIGHT_COLORS}
              activeColor={currentHighlight}
              onSelect={(c) =>
                editor.chain().focus().setHighlight({ color: c }).run()
              }
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />

            <Divider />

            {/* Alignment */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              title="Align left"
            >
              <FormatAlignLeft fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={editor.isActive({ textAlign: "center" })}
              title="Align center"
            >
              <FormatAlignCenter fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              title="Align right"
            >
              <FormatAlignRight fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              active={editor.isActive({ textAlign: "justify" })}
              title="Justify"
            >
              <FormatAlignJustify fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet list"
            >
              <FormatListBulleted fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered list"
            >
              <FormatListNumbered fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* Blocks */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Blockquote"
            >
              <FormatQuote fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code block"
            >
              <DataObject fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              <HorizontalRule fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* Link + image */}
            <ToolbarButton
              onClick={openLinkDialog}
              active={editor.isActive("link")}
              title="Insert link"
            >
              <LinkIcon fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              disabled={!editor.isActive("link")}
              title="Remove link"
            >
              <LinkOff fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              title="Insert image"
            >
              <ImageIcon fontSize="small" />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />

            <Divider />

            {/* Clear formatting */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }
              title="Clear formatting"
            >
              <FormatClear fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* History */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo fontSize="small" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo fontSize="small" />
            </ToolbarButton>

            <Divider />

            {/* Fullscreen */}
            <ToolbarButton
              onClick={() => setIsFullscreen((v) => !v)}
              active={isFullscreen}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {isFullscreen ? (
                <FullscreenExit fontSize="small" />
              ) : (
                <Fullscreen fontSize="small" />
              )}
            </ToolbarButton>

            {isUploading && (
              <span className="ml-1 shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                Uploading image…
              </span>
            )}
          </div>
        </div>

        {/* ---------------- Content (scrolls) ---------------- */}
        <div className={showFooter ? "min-h-0 flex-1 overflow-y-auto" : ""}>
          <EditorContent editor={editor} />
        </div>

        {/* ---------------- Footer: word/char count ---------------- */}
        {showFooter && (
          <div className="flex flex-none items-center justify-end gap-3 border-t bg-gray-50 px-3 py-1.5 text-[11px] text-muted-foreground dark:bg-gray-700">
            <span>
              {counts.words} {counts.words === 1 ? "word" : "words"}
            </span>
            <span className="text-border">•</span>
            <span>
              {counts.characters}{" "}
              {counts.characters === 1 ? "character" : "characters"}
            </span>
          </div>
        )}

        {/* ---------------- Link dialog ---------------- */}
        {showLinkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
              <h3 className="mb-2 text-lg font-semibold">Insert Link</h3>
              <input
                type="url"
                className="mb-2 w-80 rounded border p-2"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={{ fontSize: "16px" }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded bg-gray-300 px-3 py-1 hover:bg-gray-400"
                  onClick={() => setShowLinkDialog(false)}
                  style={{ touchAction: "manipulation" }}
                >
                  Cancel
                </button>
                <button
                  className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                  onClick={addLink}
                  style={{ touchAction: "manipulation" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Image alt dialog ---------------- */}
        {showImageAltDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
              <h3 className="mb-2 text-lg font-semibold">Image Alt Text</h3>
              <input
                id="alt-input"
                type="text"
                className="mb-2 w-80 rounded border p-2"
                placeholder="Describe the image (optional)"
                autoFocus
                style={{ fontSize: "16px" }}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded bg-gray-300 px-3 py-1 hover:bg-gray-400"
                  onClick={() => handleAltConfirm("")}
                  style={{ touchAction: "manipulation" }}
                >
                  Skip
                </button>
                <button
                  className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                  onClick={() => {
                    const alt = (
                      document.querySelector("#alt-input") as HTMLInputElement
                    )?.value;
                    handleAltConfirm(alt);
                  }}
                  style={{ touchAction: "manipulation" }}
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
