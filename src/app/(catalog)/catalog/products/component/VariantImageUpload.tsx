// components/VariantImageUploader.tsx
import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";

interface VariantImageUploaderProps {
  index: number;
  fieldCode: string;
  productId?: string;
  initialFiles?: string[];
  handleVariantChange: (
    index: number,
    field: string,
    value: string | number | string[],
  ) => void;
}

const VariantImageUploader: React.FC<VariantImageUploaderProps> = React.memo(
  ({ index, fieldCode, productId, initialFiles = [], handleVariantChange }) => {
    const safeInitialFiles = Array.isArray(initialFiles) ? initialFiles : [];

    const subfolder = `variants/variant-${index}/${fieldCode}`;
    const { files, loading, addFiles, removeFile, progressByName } =
      useFileUploader(productId, safeInitialFiles, subfolder);

    // Always store the full array of image URLs for the variant field.
    useEffect(() => {
      handleVariantChange(index, fieldCode, files);
    }, [files, index, fieldCode, handleVariantChange]);

    const handleRemove = async (indexToRemove: number, fileUrl: string) => {
      await removeFile(indexToRemove, fileUrl);
    };

    return (
      <FilesUploader
        files={files}
        loading={loading}
        addFiles={addFiles}
        onRemove={handleRemove}
        progressByName={progressByName}
      />
    );
  },
);

VariantImageUploader.displayName = "VariantImageUploader";

export default VariantImageUploader;
