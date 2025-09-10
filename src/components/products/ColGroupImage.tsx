import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";

interface ColGroupImageUploaderProps {
  index: number;
  handleColGroupChange: (
    index: number,
    field: string,
    value: string | number | string[]
  ) => void;
}

const ColGroupImageUploader: React.FC<ColGroupImageUploaderProps> = ({
  index,
  handleColGroupChange,
}) => {
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      return handleColGroupChange(index, "image", files[0]);
    }
  }, [files]);

  return (
    <FilesUploader
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />
  );
};

export default ColGroupImageUploader;
