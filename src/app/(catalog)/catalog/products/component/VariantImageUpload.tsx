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
    // Build a subfolder: variants/variant-{index}/{fieldCode}
    const subfolder = `variants/variant-${index}/${fieldCode}`;

    const { files, loading, addFiles, removeFile, progressByName } =
      useFileUploader(productId, initialFiles, subfolder);

    // Whenever files change, update the variant's field.
    // For mainImage we store a single string path, not an array.
    useEffect(() => {
      const nextValue =
        fieldCode.toLowerCase().includes("image") &&
        !fieldCode.toLowerCase().includes("images")
          ? files[0] || ""
          : files;
      handleVariantChange(index, fieldCode, nextValue);
    }, [files, index, fieldCode, handleVariantChange]);

    // Wrap removeFile to match onRemove signature
    const handleRemove = async (indexToRemove: number) => {
      await removeFile(indexToRemove);
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
