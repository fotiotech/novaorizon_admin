// hooks/useFileUploader.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import {
  getPresignedUploadUrl,
  deleteS3Object,
  deleteMultipleS3Objects,
  listS3Objects,
  getPresignedUpdateUrl,
} from "@/app/actions/s3";

export const useFileUploader = (
  instanceId?: string,
  initialFiles: string[] = [],
  subfolder?: string,
) => {
  // ✅ Guard: ensure initialFiles is always an array
  const safeInitialFiles = Array.isArray(initialFiles) ? initialFiles : [];

  const [files, setFiles] = useState<string[]>(safeInitialFiles);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {},
  );
  const mountedRef = useRef(true);
  const prevInitialFilesRef = useRef<string[]>(safeInitialFiles);

  // ----- Sync external initialFiles changes (with guard) -----
  useEffect(() => {
    const safeFiles = Array.isArray(initialFiles) ? initialFiles : [];
    const prev = prevInitialFilesRef.current;
    if (
      safeFiles.length !== prev.length ||
      safeFiles.some((url, i) => url !== prev[i])
    ) {
      setFiles(safeFiles);
      prevInitialFilesRef.current = safeFiles;
    }
  }, [initialFiles]);

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

      for (const file of toUpload) {
        if (!mountedRef.current) break;

        let filename: string;
        if (updateKey) {
          filename = updateKey.split("/").pop() || makeFilename(file);
        } else {
          filename = makeFilename(file);
        }

        setProgressByName((prev) => ({ ...prev, [filename]: 0 }));

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

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl, true);
            xhr.setRequestHeader(
              "Content-Type",
              file.type || "application/octet-stream",
            );
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable && mountedRef.current) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setProgressByName((prev) => ({ ...prev, [filename]: pct }));
              }
            });
            xhr.onload = () => {
              if (xhr.status === 200) {
                const publicUrl = `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileKey}`;
                uploadedUrls.push(publicUrl);
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(file);
          });
        } catch (error) {
          console.error("Upload error for", filename, error);
        } finally {
          if (mountedRef.current) {
            setProgressByName((prev) => {
              const updated = { ...prev };
              delete updated[filename];
              return updated;
            });
          }
        }
      }

      if (mountedRef.current) {
        if (updateKey) {
          setFiles((prev) => {
            const index = prev.findIndex((url) => url.includes(updateKey));
            if (index !== -1) {
              const newFiles = [...prev];
              newFiles[index] = uploadedUrls[0];
              return newFiles;
            }
            return prev;
          });
        } else {
          setFiles((prev) => [...prev, ...uploadedUrls]);
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

  // ✅ RESTORED: removeFile accepts (index, fileUrl) and extracts file key from URL
  const removeFile = useCallback(
    async (index: number, fileUrl: string) => {
      if (index < 0 || index >= files.length) {
        return { success: false, message: "Index out of bounds" };
      }
      // Use the provided fileUrl, but fallback to files[index] if needed
      const url = fileUrl || files[index];
      try {
        // Extract file key from the full URL
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
    } catch (error) {
      console.error("Clear files error:", error);
    }
  }, [files]);

  return {
    files,
    loading,
    progressByName,
    addFiles,
    setFiles,
    listFiles,
    updateFile,
    removeFile, // ✅ now expects (index, fileUrl)
    removeMultipleFiles,
    clearFiles,
  };
};

export default useFileUploader;
