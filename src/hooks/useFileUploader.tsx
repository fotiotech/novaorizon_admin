import { useState, useCallback, useEffect, useRef } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import { deleteProductImages } from "@/app/actions/products";

export const useFileUploader = (
  instanceId?: string,
  initialFiles: string[] = []
) => {
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {}
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const makeFilename = (file: File) =>
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${file.name.replace(
      /\s+/g,
      "_"
    )}`;

  const uploadFiles = useCallback(
    async (toUpload: File[]) => {
      if (!toUpload.length) return;
      setLoading(true);
      const uploadedUrls: string[] = [];

      for (const file of toUpload) {
        if (!mountedRef.current) break;

        const filename = makeFilename(file);
        const path = instanceId
          ? `uploads/${instanceId}/${filename}`
          : `uploads/${filename}`;
        const storageRef = ref(storage, path);

        try {
          const task = uploadBytesResumable(storageRef, file, {
            contentType: file.type || "application/octet-stream",
          });

          await new Promise<void>((resolve, reject) => {
            task.on(
              "state_changed",
              (snapshot) => {
                const pct = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                if (mountedRef.current) {
                  setProgressByName((prev) => ({ ...prev, [filename]: pct }));
                }
              },
              reject,
              async () => {
                try {
                  const downloadURL = await getDownloadURL(task.snapshot.ref);
                  uploadedUrls.push(downloadURL);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            );
          });
        } catch (error) {
          console.error("Upload error:", error);
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
        setFiles((prev) => [...prev, ...uploadedUrls]);
        setPendingFiles([]);
        setLoading(false);
      }
    },
    [instanceId]
  );

  useEffect(() => {
    if (pendingFiles.length > 0) {
      uploadFiles(pendingFiles);
    }
  }, [pendingFiles, uploadFiles]);

  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles.length) return;
    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setPendingFiles([]);
  }, []);

  const removeFile = useCallback(
    async (productId: string, index: number) => {
      if (index < 0 || index >= files.length) {
        console.error("Index out of bounds");
        return { success: false, message: "Index out of bounds" };
      }

      const fileUrl = files[index];
      try {
        // Delete from Firebase Storage
        const storageRef = ref(storage, fileUrl);
        await deleteObject(storageRef);

        // Delete from backend
        const response: any = await deleteProductImages;

        if (response.success) {
          setFiles((prev) => prev.filter((_, i) => i !== index));
          return { success: true };
        } else {
          console.error("Backend deletion failed");
          return { success: false, message: "Backend deletion failed" };
        }
      } catch (error) {
        console.error("Deletion error:", error);
        return { success: false, message: (error as Error).message };
      }
    },
    [files]
  );

  return {
    files,
    loading,
    addFiles,
    setFiles,
    removeFile,
    clearFiles,
    progressByName,
  };
};

export default useFileUploader;
