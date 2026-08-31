"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useRef, useEffect, memo } from "react";
import useFileUploader from "@/hooks/useFileUploader";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  productId: string;
}

// ---- Extensions: StarterKit contains all basic extensions, we only add Image & Placeholder ----
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] }, // restrict heading levels
    link: { openOnClick: false }, // custom link behaviour
  }),
  Image.configure({ inline: false, allowBase64: false }),
  Placeholder.configure({
    placeholder: "Write description...", // default, overridden by prop later
  }),
];

const RichTextEditor: React.FC<RichTextEditorProps> = memo(
  ({ value, onChange, placeholder, productId }) => {
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showImageAltDialog, setShowImageAltDialog] = useState(false);
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

    // ---- Editor instance ----
    const editor = useEditor({
      extensions: extensions.map((ext) => {
        // Allow dynamic placeholder override
        if (ext.name === "placeholder") {
          return Placeholder.configure({
            placeholder: placeholder || "Write description...",
          });
        }
        return ext;
      }),
      content: value,
      onUpdate: ({ editor }) => emitChange(editor.getHTML()),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose max-w-none focus:outline-none min-h-[200px] p-4 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          style: "font-size: 16px; touch-action: manipulation;",
        },
      },
    });

    // ---- Insert uploaded images ----
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

    // ---- Prevent zoom on double‑tap (iOS) ----
    useEffect(() => {
      const container = editorContainerRef.current;
      if (!container) return;
      const handleTouchStart = (e: TouchEvent) => {
        // no‑op
      };
      container.addEventListener("touchstart", handleTouchStart);
      return () =>
        container.removeEventListener("touchstart", handleTouchStart);
    }, []);

    // ---- Image upload handlers ----
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

    // ---- Render toolbar button ----
    const ToolbarButton = useCallback(
      ({ onClick, active, children, title }: any) => (
        <button
          type="button"
          onClick={onClick}
          title={title}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
            active ? "bg-gray-300 dark:bg-gray-600" : ""
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {children}
        </button>
      ),
      [],
    );

    if (!editor) {
      return (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
          Loading editor...
        </div>
      );
    }

    const isUploading = Object.values(progressByName).some((p) => p < 100);

    return (
      <div
        ref={editorContainerRef}
        className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800"
      >
        <div className="border-b p-2 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-700">
          {/* Headings */}
          <select
            className="text-sm p-1 border rounded bg-white dark:bg-gray-800"
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

          {/* Basic formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Code"
          >
            {"<>"}
          </ToolbarButton>

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            1. List
          </ToolbarButton>

          {/* Block formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            “ ”
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code Block"
          >
            {"{ }"}
          </ToolbarButton>

          {/* Link */}
          <ToolbarButton
            onClick={openLinkDialog}
            active={editor.isActive("link")}
            title="Insert Link"
          >
            🔗
          </ToolbarButton>

          {/* Image upload */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insert Image"
          >
            📷
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
              }
              e.target.value = "";
            }}
          />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </ToolbarButton>

          {isUploading && (
            <span className="text-sm text-gray-500">Uploading image…</span>
          )}
        </div>

        <EditorContent editor={editor} />

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Insert Link</h3>
              <input
                type="url"
                className="border rounded p-2 w-80 mb-2"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={{ fontSize: "16px" }}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setShowLinkDialog(false)}
                  style={{ touchAction: "manipulation" }}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={addLink}
                  style={{ touchAction: "manipulation" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Alt Text Dialog */}
        {showImageAltDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Image Alt Text</h3>
              <input
                id="alt-input"
                type="text"
                className="border rounded p-2 w-80 mb-2"
                placeholder="Describe the image (optional)"
                autoFocus
                style={{ fontSize: "16px" }}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => handleAltConfirm("")}
                  style={{ touchAction: "manipulation" }}
                >
                  Skip
                </button>
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
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
