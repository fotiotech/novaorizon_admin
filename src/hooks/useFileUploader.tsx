// hooks/useFileUploader.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { uploadFile } from "@/lib/api/upload";

type FailedUpload = { file: File; error: string };
export type InFlightUpload = { url: string; progress: number };

/**
 * Uploads files via the direct `POST /api/upload/s3` endpoint.
 *
 * `instanceId` and `subfolder` are forwarded to the backend, which uses
 * them to build a nested S3 key:
 *
 *   {instanceId}/{subfolder}/uploads/{uuid}-{filename}
 *
 * Both are optional; missing segments are dropped on the server side.
 * The hook's caller passes them positionally:
 *
 *   useFileUploader(instanceId?, initialFiles?, subfolder?)
 *
 * Notes on parity with the previous presigned-URL flow:
 *
 *  - `updateFile` re-uploads as a new object and swaps the URL in local
 *    state (the old presigned-overwrite behaviour is gone — the backend
 *    has no `getPresignedUpdateUrl` equivalent).
 *
 *  - `removeFile`, `removeMultipleFiles`, `clearFiles` are LOCAL-ONLY —
 *    the backend has no generic S3 delete endpoint. Entity-specific
 *    endpoints (e.g. `POST /categories/:id/images/delete`,
 *    `DELETE /products/images?productId=&imageUrl=`) handle S3 cleanup
 *    when the entity is persisted.
 *
 *  - `listFiles` returns the current in-memory state (no server-side
 *    listing endpoint).
 *
 *  - `progressByName` is preserved in the return shape but stays empty —
 *    the new flow tracks progress only on the in-flight placeholder tile.
 */
export const useFileUploader = (
  instanceId?: string,
  initialFiles: string[] = [],
  subfolder?: string,
) => {
  const safeInitialFiles = Array.isArray(initialFiles) ? initialFiles : [];

  const [files, setFiles] = useState<string[]>(safeInitialFiles);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [failedFiles, setFailedFiles] = useState<FailedUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressByName] = useState<Record<string, number>>({});
  const [inFlightUploads, setInFlightUploads] = useState<InFlightUpload[]>([]);

  const mountedRef = useRef(true);
  const prevInitialFilesRef = useRef<string[]>(safeInitialFiles);

  // Sync external `initialFiles` changes without re-firing on every render.
  // Depends on a content signature string, not the array reference.
  const initialFilesSignature = JSON.stringify(
    Array.isArray(initialFiles) ? initialFiles : [],
  );

  useEffect(() => {
    const safeFiles: string[] = JSON.parse(initialFilesSignature);
    const prev = prevInitialFilesRef.current;
    const sameContent =
      safeFiles.length === prev.length &&
      safeFiles.every((url, i) => url === prev[i]);
    if (sameContent) return;

    setFiles(safeFiles);
    prevInitialFilesRef.current = safeFiles;
  }, [initialFilesSignature]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const uploadFiles = useCallback(
    async (toUpload: File[]) => {
      if (!toUpload.length) return;
      setLoading(true);
      const uploadedUrls: string[] = [];

      for (const file of toUpload) {
        if (!mountedRef.current) break;

        // Synthetic in-flight key used to track this upload's placeholder
        // tile. Replaced by the real URL once the backend responds.
        const placeholderKey = `uploading-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

        if (mountedRef.current) {
          setInFlightUploads((prev) => [
            ...prev,
            { url: placeholderKey, progress: 0 },
          ]);
        }

        try {
          const result = await uploadFile(file, {
            instanceId,
            subfolder,
            onProgress: (pct) => {
              if (!mountedRef.current) return;
              setInFlightUploads((prev) =>
                prev.map((u) =>
                  u.url === placeholderKey ? { ...u, progress: pct } : u,
                ),
              );
            },
          });
          uploadedUrls.push(result.url);
        } catch (error) {
          console.error("Upload error for", file.name, error);
          if (mountedRef.current) {
            setFailedFiles((prev) => [
              ...prev,
              { file, error: (error as Error).message },
            ]);
          }
        } finally {
          if (mountedRef.current) {
            setInFlightUploads((prev) =>
              prev.filter((u) => u.url !== placeholderKey),
            );
          }
        }
      }

      if (mountedRef.current) {
        if (uploadedUrls.length > 0) {
          setFiles((prev) => [...prev, ...uploadedUrls]);
        }
        setPendingFiles([]);
        setLoading(false);
      }
    },
    [instanceId, subfolder],
  );

  // Auto-upload pending files.
  useEffect(() => {
    if (pendingFiles.length > 0) {
      uploadFiles(pendingFiles);
    }
  }, [pendingFiles, uploadFiles]);

  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles.length) return;
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const retryFailed = useCallback(() => {
    if (!failedFiles.length) return;
    const toRetry = failedFiles.map((f) => f.file);
    setFailedFiles([]);
    setPendingFiles((prev) => [...prev, ...toRetry]);
  }, [failedFiles]);

  const clearFailed = useCallback(() => setFailedFiles([]), []);

  const listFiles = useCallback(async () => {
    // No server-side listing endpoint — return current state.
    return files;
  }, [files]);

  const updateFile = useCallback(
    async (index: number, newFile: File) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      try {
        const result = await uploadFile(newFile, { instanceId, subfolder });
        setFiles((prev) => prev.map((u, i) => (i === index ? result.url : u)));
        return { success: true, url: result.url };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    },
    [files, instanceId, subfolder],
  );

  const removeFile = useCallback(
    async (index: number, fileUrl: string) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      // Local-only — the backend has no generic S3 delete endpoint.
      void fileUrl;
      setFiles((prev) => prev.filter((_, i) => i !== index));
      return { success: true };
    },
    [files],
  );

  const removeMultipleFiles = useCallback(
    async (indices: number[]) => {
      if (!indices.length) {
        return { success: false, message: "No indices provided" };
      }
      const valid = indices.filter((i) => i >= 0 && i < files.length);
      if (!valid.length) {
        return { success: false, message: "No valid indices" };
      }
      setFiles((prev) => prev.filter((_, i) => !valid.includes(i)));
      return { success: true, deleted: valid.length };
    },
    [files],
  );

  const clearFiles = useCallback(async () => {
    setFiles([]);
    setPendingFiles([]);
    setFailedFiles([]);
  }, []);

  return {
    files,
    inFlightUploads,
    loading,
    progressByName,
    failedFiles,
    addFiles,
    setFiles,
    listFiles,
    updateFile,
    removeFile,
    removeMultipleFiles,
    retryFailed,
    clearFailed,
    clearFiles,
  };
};

export default useFileUploader;
