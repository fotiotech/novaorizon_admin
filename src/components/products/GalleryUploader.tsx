// components/GalleryUploader.tsx
import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";

interface GalleryUploaderProps {
  productId: string;
  field: string[];
  code: string;
}

const GalleryUploader: React.FC<GalleryUploaderProps> = ({
  productId,
  field = [],
  code,
}) => {
  const dispatch = useAppDispatch();

  const {
    files,
    loading,
    addFiles,
    removeFile,
    setFiles,
    listFiles,
    progressByName,
  } = useFileUploader(productId, [], "gallery");

  // Load existing gallery images from S3 (only gallery folder)
  useEffect(() => {
    if (productId) {
      listFiles();
    }
  }, [productId, listFiles]);

  // If initial field (existing gallery URLs) is provided, set it (only on mount)
  useEffect(() => {
    if (field && field.length > 0) {
      setFiles(field);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Dispatch to Redux
  useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: files,
        }),
      );
    } else {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: [],
        }),
      );
    }
  }, [files, dispatch, productId, code]);

  // Wrap removeFile to match onRemove signature
  const handleRemove = async (index: number) => {
    await removeFile(index);
  };

  return (
    <div className="w-full">
      <FilesUploader
        files={files}
        loading={loading}
        addFiles={addFiles}
        onRemove={handleRemove}
        progressByName={progressByName}
      />
    </div>
  );
};

export default GalleryUploader;
