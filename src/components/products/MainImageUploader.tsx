// components/MainImageUploader.tsx
import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";

interface MainImageUploaderProps {
  productId: string;
  field?: string | null;
  code: string;
}

const MainImageUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  field,
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
  } = useFileUploader(productId, [], "main"); // 👈 subfolder = 'main'

  // Load existing main images from S3 (only main folder)
  useEffect(() => {
    if (productId) {
      listFiles();
    }
  }, [productId, listFiles]);

  // If field (existing main image URL) is provided, set it
  useEffect(() => {
    if (field) {
      setFiles([field]);
    }
  }, [field, setFiles]);

  // Dispatch to Redux
  useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: files[0],
        }),
      );
    } else {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: null,
        }),
      );
    }
  }, [files, dispatch, productId, code]);

  return (
    <FilesUploader
      productId={productId}
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
      progressByName={progressByName}
    />
  );
};

export default MainImageUploader;
