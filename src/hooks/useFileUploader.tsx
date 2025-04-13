import { useState, useCallback, useEffect } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";

export const useFileUploader = (initialFiles: string[] = []) => {
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
        const storageRef = ref(storage, `uploads/${file.name}`);
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
  }, [imgFiles]);

  useEffect(() => {
    if (imgFiles.length > 0) {
      upload();
    }
  }, [imgFiles]);

  const addFiles = (newFiles: File[]) => {
    setImgFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = async (index: number, filesContent?: string[]) => {
    if (filesContent?.length === 0) {
      console.error("No files to remove.");
      return;
    }

    if (index < 0 || index >= filesContent?.length!) {
      console.error("Index out of bounds:", index);
      return;
    }

    const fileToRemove = filesContent?.[index && index];

    if (!fileToRemove) {
      console.error("No file found at the given index.");
      return;
    }

    try {
      const url = new URL(fileToRemove);
      const encodedFileName = url.pathname.split("/").pop();

      if (!encodedFileName) {
        throw new Error("Unable to extract file name from URL.");
      }

      const fileName = decodeURIComponent(encodedFileName);
      const storageRef = ref(
        storage,
        fileName.startsWith("uploads/") ? fileName : `uploads/${fileName}`
      );

      // Delete the object from Firebase Storage
      await deleteObject(storageRef);
      console.log(`Deleted ${fileToRemove} from storage.`);
    } catch (error) {
      console.error("Error deleting file from storage:", error);
    }

    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const removeFile = (index: number, filesContent?: string[]) => {
    setTimeout(() => {
      handleRemoveFile(index, filesContent);
    }, 1000); // Delays execution to allow state to update
  };

  return {
    files,
    loading,
    addFiles,
    removeFile,
  };
};
