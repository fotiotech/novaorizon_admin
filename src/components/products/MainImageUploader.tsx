import React, { useEffect, useMemo } from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";

interface MainImageUploaderProps {
  productId: string;
  path: string;
  stored?: string | null; // existing image URL (optional)
}

const MainImageUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  path,
  stored,
}) => {
  const dispatch = useAppDispatch();

  // Convert existing stored URL (string) into StoredFile shape expected by the hook
  const initialFiles = useMemo(() => {
    if (stored) {
      return [{ url: stored, path: "" }]; // path unknown for existing item; backend should store path if deletion required
    }
    return [];
  }, [stored]);

  // pass productId as instanceId so uploads are namespaced by product
  const { files, loading, addFiles, removeFile } = useFileUploader(
    productId,
    initialFiles
  );

  // Update Redux when the main image changes
  useEffect(() => {
    // prefer newly uploaded URL; fallback to stored prop if present
    const url = files.length > 0 ? files[0].url : stored ?? "";
    // only update if we have something meaningful
    if (url) {
      dispatch(
        addProduct({
          _id: productId,
          path,
          value: url,
        })
      );
    }
    // Note: if you want to clear the product field when url becomes empty,
    // add an else branch to dispatch a blank value.
  }, [files, stored, dispatch, productId, path]);

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
