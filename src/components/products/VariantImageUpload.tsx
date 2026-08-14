import React, { useEffect } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";

interface VariantImageUploaderProps {
  index: number;
  productId?: string;
  handleVariantChange: (
    index: number,
    field: string,
    value: string | number | string[],
  ) => void;
}

const VariantImageUploader: React.FC<VariantImageUploaderProps> = React.memo(
  ({ index, productId, handleVariantChange }) => {
    const { files, loading, addFiles, removeFile, progressByName } =
      useFileUploader(productId);

    useEffect(() => {
      handleVariantChange(index, "gallery", files);
    }, [files, index, handleVariantChange]);

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
