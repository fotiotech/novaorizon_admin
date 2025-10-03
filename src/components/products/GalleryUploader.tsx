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

  // Initialize files from field prop only once
  React.useEffect(() => {
    if (field && field.length > 0) {
      setFiles(field);
    }
  }, []); // Empty dependency array - run only on mount

  // Update Redux when files change, but only if files are different from current field
  React.useEffect(() => {
    if (files.length > 0 && JSON.stringify(files) !== JSON.stringify(field)) {
      dispatch(
        addProduct({
          _id: productId,
          field: code,
          value: files,
        })
      );
    }
  }, [files, dispatch, productId, code]); // Removed field from dependencies

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
