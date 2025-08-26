import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface MainImageUploaderProps {
  productId: string;
  path: string;
  stored: string;
  code: string;
}

function buildPath(groupCode: string, field: string, idx?: number | null) {
  if (!groupCode && !field) return "";

  // fullBase is the prefix we'll prepend (if groupCode present)
  const prefix = groupCode ? `${groupCode}.` : "";

  if (idx == null) {
    return `${prefix}${field}`;
  }

  // split into segments and insert index into the first segment that is not an index-only numeric
  const segments = field.split(".");

  const targetIdx = (() => {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (/^\d+$/.test(s)) {
        // numeric-only seg like "0" -> convert to "[0]" form on that seg
        segments[i] = `[${s}]`;
        return segments.join(".");
      }
      if (/\[\d+\]$/.test(s)) {
        // already contains index, leave it
        return segments.join(".");
      }
      // common case: attach index to the first non-numeric segment
      // attach and return
      segments[i] = `${s}[${idx}]`;
      return segments.join(".");
    }
    // fallback: append to end
    return `${field}[${idx}]`;
  })();

  return `${prefix}${targetIdx}`;
}

const GalleryUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  path,
  stored,
  code,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  const p = buildPath(path, code, null);

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          path: p,
          value: files ?? stored,
        })
      );
    }
  }, [files, dispatch, productId, p]);

  return (
    <FilesUploader
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />
  );
};

export default GalleryUploader;
