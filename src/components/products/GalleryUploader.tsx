import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface MainImageUploaderProps {
  productId: string;
  field: string[];
  code: string;
}

const GalleryUploader: React.FC<MainImageUploaderProps> = ({
  productId,
  field = [],
  code,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile, setFiles } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (field) {
      setFiles(field);
    }
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: files ?? field,
        })
      );
    }
  }, [setFiles, files, dispatch, productId, field, code]);

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
