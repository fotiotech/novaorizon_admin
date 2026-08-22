import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";

interface VariantImageUploaderProps {
  index: number;
  fieldCode: string; // new – which variant field to update
  productId?: string; // new – used as base S3 folder
  initialFiles?: string[]; // new – existing URLs for this field
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

    // Whenever files change, update the variant's field
    useEffect(() => {
      handleVariantChange(index, fieldCode, files);
    }, [files, index, fieldCode, handleVariantChange]);

    return (
      <FilesUploader
        productId={productId || `variant-${index}`}
        files={files}
        loading={loading}
        addFiles={addFiles}
        removeFile={removeFile}
        progressByName={progressByName}
      />
    );
  },
);

VariantImageUploader.displayName = "VariantImageUploader";

export default VariantImageUploader;
