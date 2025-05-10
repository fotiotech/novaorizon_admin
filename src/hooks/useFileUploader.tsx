import { useState, useCallback, useEffect } from "react";
import {
  ref,
  uploadBytes,
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

  // Monitor changes to the `files` state
  const upload = useCallback(async () => {
    if (imgFiles.length === 0) return;

    setLoading(true);
    const urls: string[] = [];

    for (const file of imgFiles) {
      try {
        // Include instanceId in the storage path to keep files separate
        const path = instanceId
          ? `uploads/${instanceId}/${file.name}`
          : `uploads/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        urls.push(downloadURL);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setFiles((prev) => [...prev, ...urls]);
    setImgFiles([]);
    setLoading(false);
  }, [imgFiles, instanceId]);

  useEffect(() => {
    if (imgFiles.length > 0) {
      upload();
    }
  }, [imgFiles, upload]);

  const addFiles = (newFiles: File[]) => {
    setImgFiles((prev) => [...prev, ...newFiles]);
  };

  const clearFiles = () => {
    setFiles([]);
    setImgFiles([]);
  };

  const handleRemoveFile = async (
    id: string,
    index: number,
    filesContent?: string[]
  ) => {
    if (!filesContent || filesContent.length === 0) {
      console.error("No files to remove.");
      return;
    }

    if (index < 0 || index >= filesContent.length) {
      console.error("Index out of bounds:", index);
      return;
    }

    const fileToRemove = filesContent[index];

    if (!fileToRemove) {
      console.error("No file found at the given index.");
      return;
    }

    try {
      const res = await deleteProductImages(id, fileToRemove);

      if (res?.success) {
        setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
      }
    } catch (error) {
      console.error(
        `Error deleting file "${fileToRemove}" for product ID "${id}":`,
        error
      );
    }
  };

  const removeFile = (id: string, index: number, filesContent?: string[]) => {
    handleRemoveFile(id, index, filesContent);
  };

  return {
    files,
    loading,
    addFiles,
    removeFile,
    clearFiles,
  };
};
