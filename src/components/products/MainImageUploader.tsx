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
  const { files, loading, addFiles, removeFile } = useFileUploader(productId, [
    field as string,
  ]);
  // Update Redux when the main image changes
  useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: files[0],
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
