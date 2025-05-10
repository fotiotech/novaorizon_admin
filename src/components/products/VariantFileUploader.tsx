import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { updateVariantField } from "@/app/store/slices/productSlice";
import { useAppDispatch } from "@/app/hooks";

interface VariantFileUploaderProps {
  productId: string;
  variantIndex: number;
  initialFiles: string[];
}

const VariantFileUploader: React.FC<VariantFileUploaderProps> = ({
  productId,
  variantIndex,
  initialFiles,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader(
    `variant-${productId}-${variantIndex}`,
    initialFiles
  );

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      dispatch(
        updateVariantField({
          productId,
          index: variantIndex,
          field: "imageUrls",
          value: files,
        })
      );
    }
  }, [files, dispatch, productId, variantIndex]);

  return (
    <FilesUploader
      files={files}
      addFiles={addFiles}
      instanceId={`variant-${productId}-${variantIndex}`}
    />
  );
};

export default VariantFileUploader;
