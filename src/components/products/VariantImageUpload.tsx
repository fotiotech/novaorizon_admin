import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch } from "@/app/hooks";

interface VariantImageUploaderProps {
  index: number;
  handleVariantChange: (
    index: number,
    field: string,
    value: string | number | string[]
  ) => void;
}

const VariantImageUploader: React.FC<VariantImageUploaderProps> = ({
  index,
  handleVariantChange,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      return handleVariantChange(index, "gallery", files);
    }
  }, [files, dispatch]);

  return (
    <FilesUploader
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />
  );
};

export default VariantImageUploader;
