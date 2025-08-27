import React, { useEffect, useMemo } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";

interface MainImageUploaderProps {
  productId: string;
  field?: string | null; // existing image URL (optional)
  code: string;
}

const MainImageUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  field,
  code,
}) => {
  const dispatch = useAppDispatch();

  // pass productId as instanceId so uploads are namespaced by product
  const { files, loading, addFiles, removeFile } = useFileUploader();
  // Update Redux when the main image changes
  useEffect(() => {
    // prefer newly uploaded URL; fallback to stored prop if present
    const url = files.length > 0 ? files[0] : field ?? "";
    // only update if we have something meaningful
    if (url) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: url,
        })
      );
    }
    // Note: if you want to clear the product field when url becomes empty,
    // add an else branch to dispatch a blank value.
  }, [files, field, dispatch, productId, code]);

  return (
    <FilesUploader
      productId={productId}
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />
  );
};

export default MainImageUploader;
