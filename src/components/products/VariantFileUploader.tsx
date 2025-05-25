import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updateVariants } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

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
  const variants = useAppSelector(
    (state: RootState) => state.product.byId[productId]?.variants || []
  );
  const { files, loading, addFiles, removeFile } = useFileUploader(
    `variant-${productId}-${variantIndex}`,
    initialFiles
  );

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      const updated = variants.map((v: any, i: any) =>
        i === variantIndex ? { ...v, imageUrls: files } : v
      );

      dispatch(updateVariants({ productId, variants: updated }));
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
