// components/VariantImageUpload.tsx
import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";

interface VariantImageUploaderProps {
  index: number;
  productId?: string; // optional, for S3 namespace
  handleVariantChange: (
    index: number,
    field: string,
    value: string | number | string[],
  ) => void;
}

const VariantImageUploader: React.FC<VariantImageUploaderProps> = ({
  index,
  productId,
  handleVariantChange,
}) => {
  // Use productId as instanceId if provided, else undefined
  const { files, loading, addFiles, removeFile, progressByName } =
    useFileUploader(productId);

  // Update parent state when files change
  useEffect(() => {
    handleVariantChange(index, "gallery", files);
  }, [files, index, handleVariantChange]);

  return (
    <FilesUploader
      // We don't have a productId to pass for deletion? The removeFile expects productId but it's not used in the hook.
      // We can pass any string; but it's better to pass the actual productId if available.
      productId={productId || `variant-${index}`}
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
      progressByName={progressByName}
    />
  );
};

export default VariantImageUploader;
