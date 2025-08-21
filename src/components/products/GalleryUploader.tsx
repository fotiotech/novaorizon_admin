import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface MainImageUploaderProps {
  productId: string;
  path: string;
  stored: string;
}

const GalleryUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  path,
  stored,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          path,
          value: files ?? stored,
        })
      );
    }
  }, [files, dispatch, productId]);

  return (
    <FilesUploader
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />
  );
};

export default GalleryUploader;
