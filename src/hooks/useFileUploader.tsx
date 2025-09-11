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
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [loading, setLoading] = useState(false);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {}
  );

  // Add this useEffect to update files when initialFiles changes
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const makeFilename = (f: File) =>
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${f.name.replace(
      /\s+/g,
      "_"
    )}`;

  const uploadFiles = useCallback(
    async (toUpload: File[]) => {
      if (!toUpload || toUpload.length === 0) return;
      setLoading(true);
      const uploaded: string[] = [];

      for (const file of toUpload) {
        if (!mountedRef.current) break;
        const filename = makeFilename(file);
        const path = instanceId
          ? `uploads/${instanceId}/${filename}`
          : `uploads/${filename}`;

        const storageRef = ref(storage, path);

        try {
          const metadata = {
            contentType: file.type || "application/octet-stream",
          };
          const task = uploadBytesResumable(storageRef, file, metadata);

          await new Promise<void>((resolve, reject) => {
            task.on(
              "state_changed",
              (snap) => {
                const pct = Math.round(
                  (snap.bytesTransferred / snap.totalBytes) * 100
                );
                if (mountedRef.current) {
                  setProgressByName((p) => ({ ...p, [filename]: pct }));
                }
              },
              (err) => {
                console.error("Upload failed", err);
                reject(err);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(task.snapshot.ref);
                  uploaded.push(downloadURL);
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }
            );
          });
        } catch (err) {
          console.error("Upload error for file", file.name, err);
        } finally {
          if (mountedRef.current) {
            setProgressByName((p) => {
              const copy = { ...p };
              delete copy[filename];
              return copy;
            });
          }
        }
      }

      if (!mountedRef.current) return;
      setFiles((prev) => [...prev, ...uploaded]);
      setImgFiles([]);
      setLoading(false);
    },
    [instanceId]
  );

  useEffect(() => {
    if (imgFiles.length > 0) {
      uploadFiles(imgFiles);
    }
  }, [imgFiles, uploadFiles]);

  const addFiles = (newFiles: File[] | null) => {
    if (!newFiles || newFiles.length === 0) return;
    setImgFiles((prev) => [...prev, ...newFiles]);
  };

  const clearFiles = () => {
    setFiles([]);
    setImgFiles([]);
  };

  const handleRemoveFile = async (
    productId: string,
    index: number,
    filesContent?: string[]
  ) => {
    const list = filesContent ?? files;
    if (index < 0 || index >= list.length) {
      console.error("Index out of bounds");
      return { success: false, message: "index out of bounds" };
    }

    const fileUrl = list[index];
    if (!fileUrl) {
      console.error("No file URL found");
      return { success: false, message: "no file URL" };
    }

    try {
      // Create a reference directly from the URL
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);

      const res = await deleteProductImages(productId, fileUrl);
      if (res?.success) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        return { success: true };
      } else {
        console.warn("Backend deletion failed", res);
        return { success: false, message: "backend failed" };
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, message: String(error) };
    }
  };

  const removeFile = useCallback(
    (productId: string, index: number, filesContent?: string[]) =>
      handleRemoveFile(productId, index, filesContent),
    [files]
  );

  return {
    files,
    loading,
    addFiles,
    removeFile,
    clearFiles,
    progressByName,
  };
};
