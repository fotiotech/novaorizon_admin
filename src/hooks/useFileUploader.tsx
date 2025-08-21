import { useState, useCallback, useEffect, useRef } from "react";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import { deleteProductImages } from "@/app/actions/products";

// file info we keep in state
type StoredFile = {
  url: string;
  path: string; // storage path used to upload (use this to delete)
};

export const useFileUploader = (
  instanceId?: string,
  initialFiles: StoredFile[] = []
) => {
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [files, setFiles] = useState<StoredFile[]>(initialFiles);
  const [loading, setLoading] = useState(false);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {}
  );

  // used to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // helper to create unique filename
  const makeFilename = (f: File) =>
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${f.name.replace(
      /\s+/g,
      "_"
    )}`;

  const uploadFiles = useCallback(
    async (toUpload: File[]) => {
      if (!toUpload || toUpload.length === 0) return;
      setLoading(true);
      const uploaded: StoredFile[] = [];

      // perform uploads sequentially to keep code simple; change to Promise.all for parallel
      for (const file of toUpload) {
        if (!mountedRef.current) break;
        const filename = makeFilename(file);
        const path = instanceId
          ? `uploads/${instanceId}/${filename}`
          : `uploads/${filename}`;

        const storageRef = ref(storage, path);

        try {
          // use resumable to track progress and set contentType
          const metadata = {
            contentType: file.type || "application/octet-stream",
          };
          const task = uploadBytesResumable(storageRef, file, metadata);

          // listen for progress
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
                  uploaded.push({ url: downloadURL, path });
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
          // cleanup progress for that file
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

      // append uploaded files (keep order)
      setFiles((prev) => [...prev, ...uploaded]);
      setImgFiles([]); // consumed
      setLoading(false);
    },
    [instanceId]
  );

  // auto-trigger uploads when files are added
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

  // remove by index but use stored path to delete from storage first
  const handleRemoveFile = async (
    productId: string,
    index: number,
    filesContent?: StoredFile[] // optional - if provided we use this array, otherwise use internal files
  ) => {
    const list = filesContent ?? files;
    if (!list || list.length === 0) {
      console.error("No files to remove.");
      return { success: false, message: "no files" };
    }
    if (index < 0 || index >= list.length) {
      console.error("Index out of bounds:", index);
      return { success: false, message: "index out of bounds" };
    }

    const fileToRemove = list[index];
    if (!fileToRemove || !fileToRemove.path) {
      console.error("No file path found at index:", index, fileToRemove);
      return { success: false, message: "no file path" };
    }

    try {
      // delete in Firebase Storage using stored path
      const storageRef = ref(storage, fileToRemove.path);
      await deleteObject(storageRef);

      // optionally also call your backend to unlink from product DB
      // assuming deleteProductImages expects (productId, fileUrlOrPath)
      // Use whichever it expects — prefer sending the storage path if backend expects path.
      const res = await deleteProductImages(productId, fileToRemove.path);
      if (res?.success) {
        // remove locally
        setFiles((prev) => prev.filter((_, i) => i !== index));
        return { success: true };
      } else {
        // backend failed — log and still remove locally if you want, but better to keep in sync
        console.warn("Backend deleteProductImages failed", res);
        return { success: false, message: "backend failed" };
      }
    } catch (error) {
      console.error(
        `Error deleting file "${fileToRemove.path}" for product ID "${productId}":`,
        error
      );
      return { success: false, message: String(error) };
    }
  };

  // expose a simple remove wrapper (keeps API similar to yours)
  const removeFile = (
    productId: string,
    index: number,
    filesContent?: StoredFile[]
  ) => handleRemoveFile(productId, index, filesContent);

  return {
    files, // array of { url, path } objects — easier to manage deletes
    loading,
    addFiles,
    removeFile,
    clearFiles,
    progressByName, // optional UI: show per-file upload percent
  };
};
