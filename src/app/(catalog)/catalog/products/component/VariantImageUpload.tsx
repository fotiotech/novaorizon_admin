// components/VariantImageUploader.tsx
import React, { useEffect, useRef } from "react";
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

    // BUG 5: pin the callback to a ref. The parent recreates
    // `handleVariantChange` whenever the selected themes change, which used
    // to make this effect fire on every variant row and clobber uncommitted
    // edits in other rows. With the ref, the effect only fires when `files`
    // actually changes.
    const cbRef = useRef(handleVariantChange);
    useEffect(() => {
      cbRef.current = handleVariantChange;
    }, [handleVariantChange]);

    useEffect(() => {
      cbRef.current(index, fieldCode, files);
    }, [files, index, fieldCode]);

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
