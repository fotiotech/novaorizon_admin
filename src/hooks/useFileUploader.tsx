// hooks/useFileUploader.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import {
  getPresignedUploadUrl,
  deleteS3Object,
  deleteMultipleS3Objects,
  listS3Objects,
  getPresignedUpdateUrl,
} from "@/app/actions/s3";

type FailedUpload = { file: File; error: string };
export type InFlightUpload = { url: string; progress: number };

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
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {},
  );
  // In-flight NEW uploads, shown as tiles until they land in `files`.
  // Updates (overwrites) don't appear here — their URL is already in
  // `files`, and progress is tracked via `progressByName` on that tile.
  const [inFlightUploads, setInFlightUploads] = useState<InFlightUpload[]>([]);

  const mountedRef = useRef(true);
  const prevInitialFilesRef = useRef<string[]>(safeInitialFiles);

  // ---------------------------------------------------------------------
  // Sync external initialFiles changes.
  // ---------------------------------------------------------------------
  // The dependency is the CONTENT SIGNATURE (a string), not the array
  // reference. A parent that computes `initialFiles` inline — e.g.
  //   useFileUploader(id, editorial?.images ?? [], ...)
  //   useFileUploader(id, product.images.map(i => i.url), ...)
  // creates a new array reference every render. Depending on the array
  // itself would fire this effect on every render and, combined with the
  // state updates below, produce "Maximum update depth exceeded".
  // Depending on the string signature only re-fires when the CONTENT
  // actually changes.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilesSignature]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const makeFilename = (file: File) =>
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${file.name.replace(/\s+/g, "_")}`;

  const uploadFiles = useCallback(
    async (toUpload: File[], updateKey?: string) => {
      if (!toUpload.length) return;
      setLoading(true);
      const uploadedUrls: string[] = [];
      // Every URL we START uploading in this batch (success or fail).
      // Used to remove placeholder tiles from inFlightUploads atomically
      // at the end of the batch.
      const startedUrls: string[] = [];

      for (const file of toUpload) {
        if (!mountedRef.current) break;

        const filename = updateKey
          ? updateKey.split("/").pop() || makeFilename(file)
          : makeFilename(file);

        // progressKey MUST equal the S3 object's basename so that
        // FilesUploader's `getProgress(url)` — which does
        // `url.split("/").pop()` — finds the right entry.
        let progressKey: string | undefined;

        try {
          let uploadUrl: string;
          let fileKey: string;

          if (updateKey) {
            const result = await getPresignedUpdateUrl(updateKey, file.type);
            uploadUrl = result.uploadUrl;
            fileKey = updateKey;
          } else {
            const result = await getPresignedUploadUrl(
              filename,
              file.type,
              instanceId,
              undefined,
              subfolder,
            );
            uploadUrl = result.uploadUrl;
            fileKey = result.fileKey;
          }

          progressKey = fileKey.split("/").pop() || filename;
          const publicUrl = `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileKey}`;

          // Track NEW uploads (not updates) so the UI can render a
          // placeholder tile with a live progress bar.
          if (!updateKey && mountedRef.current) {
            startedUrls.push(publicUrl);
            setInFlightUploads((prev) => [
              ...prev,
              { url: publicUrl, progress: 0 },
            ]);
          }

          if (mountedRef.current) {
            setProgressByName((prev) => ({ ...prev, [progressKey!]: 0 }));
          }

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl, true);
            xhr.setRequestHeader(
              "Content-Type",
              file.type || "application/octet-stream",
            );
            xhr.timeout = 120_000;

            xhr.upload.addEventListener("progress", (event) => {
              if (!event.lengthComputable || !mountedRef.current) return;
              const pct = Math.round((event.loaded / event.total) * 100);

              // Updates: progress shown on the existing tile via progressByName
              if (progressKey) {
                setProgressByName((prev) => ({ ...prev, [progressKey!]: pct }));
              }
              // New uploads: progress shown on the placeholder tile
              if (!updateKey) {
                setInFlightUploads((prev) =>
                  prev.map((u) =>
                    u.url === publicUrl ? { ...u, progress: pct } : u,
                  ),
                );
              }
            });

            xhr.onload = () => {
              // S3 returns 200; some S3-compatible providers return 201/204.
              if (xhr.status >= 200 && xhr.status < 300) {
                uploadedUrls.push(publicUrl);
                resolve();
              } else {
                reject(
                  new Error(
                    `Upload rejected: HTTP ${xhr.status} ${xhr.statusText || ""}`.trim(),
                  ),
                );
              }
            };

            xhr.onerror = () => {
              // Only fires when the browser blocks the request before it
              // reaches a readable response — CSP, CORS, DNS, offline,
              // mixed content, or a cross-region 301 without CORS headers.
              const origin =
                typeof window !== "undefined"
                  ? window.location.origin
                  : "your origin";
              reject(
                new Error(
                  `Network error uploading "${filename}" (status=${xhr.status}). ` +
                    `Browser blocked the request before it reached S3 — check ` +
                    `CSP connect-src allows https://*.amazonaws.com from ` +
                    `${origin}, and that AWS_REGION matches the bucket region.`,
                ),
              );
            };

            xhr.ontimeout = () =>
              reject(new Error(`Upload timed out: "${filename}"`));
            xhr.onabort = () =>
              reject(new Error(`Upload aborted: "${filename}"`));

            xhr.send(file);
          });
        } catch (error) {
          console.error("Upload error for", filename, error);
          if (mountedRef.current) {
            // Keep failed uploads around so callers can surface / retry
            // them instead of silently dropping them.
            setFailedFiles((prev) => [
              ...prev,
              { file, error: (error as Error).message },
            ]);
          }
        } finally {
          // Clear the per-file progress entry. For updates this is the
          // only tracking mechanism. For new uploads we don't delete here
          // because the tile lives in inFlightUploads and its progress
          // is tracked there — deleting here would clear the bar before
          // the placeholder is removed at end of batch.
          if (mountedRef.current && progressKey && updateKey) {
            setProgressByName((prev) => {
              const updated = { ...prev };
              delete updated[progressKey!];
              return updated;
            });
          }
        }
      }

      if (mountedRef.current) {
        // Batch the `files` addition and `inFlightUploads` cleanup
        // together so the placeholder tile is replaced by the real image
        // in one render — no flicker between 100% and "image loaded".
        if (!updateKey && uploadedUrls.length > 0) {
          setFiles((prev) => [...prev, ...uploadedUrls]);
        }
        if (!updateKey && startedUrls.length > 0) {
          setInFlightUploads((prev) =>
            prev.filter((u) => !startedUrls.includes(u.url)),
          );
        }
        // On failure, remove placeholder tiles for the failed files so
        // they don't linger at some stale progress %.
        const failedInBatch = startedUrls.filter(
          (url) => !uploadedUrls.includes(url),
        );
        if (!updateKey && failedInBatch.length > 0) {
          setInFlightUploads((prev) =>
            prev.filter((u) => !failedInBatch.includes(u.url)),
          );
        }

        setPendingFiles([]);
        setLoading(false);
      }
    },
    [instanceId, subfolder],
  );

  // Auto-upload pending files
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
    setLoading(true);
    try {
      const objects = await listS3Objects(instanceId, subfolder);
      const urls = objects.map((obj) => obj.url);
      if (mountedRef.current) {
        setFiles(urls);
      }
      return urls;
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [instanceId, subfolder]);

  const updateFile = useCallback(
    async (index: number, newFile: File) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      const oldUrl = files[index];
      const key = oldUrl.split("/").slice(3).join("/");
      await uploadFiles([newFile], key);
      return { success: true };
    },
    [files, uploadFiles],
  );

  const removeFile = useCallback(
    async (index: number, fileUrl: string) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      const url = fileUrl || files[index];
      try {
        const urlObj = new URL(url);
        const fileKey = urlObj.pathname.startsWith("/")
          ? urlObj.pathname.slice(1)
          : urlObj.pathname;
        await deleteS3Object(fileKey);
        setFiles((prev) => prev.filter((_, i) => i !== index));
        return { success: true };
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    },
    [files],
  );

  const removeMultipleFiles = useCallback(
    async (indices: number[]) => {
      const toRemove = indices
        .filter((i) => i >= 0 && i < files.length)
        .map((i) => files[i]);
      if (!toRemove.length) {
        return { success: false, message: "No valid files to remove" };
      }
      try {
        await deleteMultipleS3Objects(toRemove);
        setFiles((prev) => prev.filter((_, i) => !indices.includes(i)));
        return { success: true, deleted: toRemove.length };
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    },
    [files],
  );

  const clearFiles = useCallback(async () => {
    if (!files.length) return;
    try {
      await deleteMultipleS3Objects(files);
      setFiles([]);
      setPendingFiles([]);
      setFailedFiles([]);
    } catch (error) {
      console.error("Clear files error:", error);
    }
  }, [files]);

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
