"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlock from "@tiptap/extension-code-block";
import Blockquote from "@tiptap/extension-blockquote";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Heading from "@tiptap/extension-heading";
import { useState, useCallback, useRef } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageAltDialog, setShowImageAltDialog] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || "Write description..." }),
      Link.configure({ openOnClick: false }),
      CodeBlock,
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
      Heading.configure({ levels: [1, 2, 3] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose max-w-none focus:outline-none min-h-[200px] p-4 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
      },
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { uploadImage } = await import("@/utils/uploadImage.ts" as any); // dynamic import
      const url = await uploadImage(file);
      setPendingImageUrl(url);
      setShowImageAltDialog(true);
    } catch (error) {
      console.error("Image upload failed", error);
    } finally {
      setUploading(false);
    }
  }, []);

  const insertImageWithAlt = useCallback((alt: string) => {
    if (pendingImageUrl) {
      editor?.chain().focus().setImage({ src: pendingImageUrl, alt }).run();
      setPendingImageUrl("");
      setShowImageAltDialog(false);
    }
  }, [editor, pendingImageUrl]);

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

  const ToolbarButton = ({ onClick, active, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
        active ? "bg-gray-300 dark:bg-gray-600" : ""
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <div className="border-b p-2 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-700">
        {/* Headings */}
        <select
          className="text-sm p-1 border rounded bg-white dark:bg-gray-800"
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level } as any).run();
          }}
          value={(() => {
            if (editor.isActive("heading", { level: 1 })) return "1";
            if (editor.isActive("heading", { level: 2 })) return "2";
            if (editor.isActive("heading", { level: 3 })) return "3";
            return "0";
          })()}
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
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert Image">
          📷
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
          ↶
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
          ↷
        </ToolbarButton>

        {uploading && <span className="text-sm text-gray-500">Uploading image...</span>}
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
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={addLink}
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
              type="text"
              className="border rounded p-2 w-80 mb-2"
              placeholder="Describe the image (optional)"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => {
                  insertImageWithAlt("");
                  setShowImageAltDialog(false);
                }}
              >
                Skip
              </button>
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => {
                  const alt = (document.querySelector("#alt-input") as HTMLInputElement)?.value;
                  insertImageWithAlt(alt);
                }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}