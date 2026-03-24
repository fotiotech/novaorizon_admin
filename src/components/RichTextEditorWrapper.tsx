"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// ✅ No type import from the editor file – we define the props locally
interface RichTextEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = dynamic(() => import("./RichTextEditor" as any), {
  ssr: false,                     // ✅ Never render on the server
  loading: () => (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
      Loading editor...
    </div>
  ),
}) as ComponentType<RichTextEditorWrapperProps>;

export default function RichTextEditorWrapper(props: RichTextEditorWrapperProps) {
  return <RichTextEditor {...props} />;
}