"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

interface RichTextEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  productId: string;
  /** Bounds the scrollable content area. Toolbar stays pinned above it. */
  contentMaxHeight?: number | string;
  /** Stretch to fill parent height. Overrides contentMaxHeight. */
  fillContainer?: boolean;
}

const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
      Loading editor...
    </div>
  ),
}) as ComponentType<RichTextEditorWrapperProps>;

export default function RichTextEditorWrapper(
  props: RichTextEditorWrapperProps,
) {
  return <RichTextEditor {...props} />;
}
