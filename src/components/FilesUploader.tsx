import React, { useEffect, useRef } from "react";
import { AttachFile } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { useFileUploader } from "@/hooks/useFileUploader";
import Spinner from "./Spinner";
import { useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";

type FilesUploaderProps = {
  files: string[];
  addFiles: (newFiles: File[]) => void;
  instanceId?: string; // Add instanceId prop
};

const FilesUploader: React.FC<FilesUploaderProps> = ({
  files,
  addFiles,
  instanceId,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];

  const { loading, removeFile } = useFileUploader(instanceId);

  const onDrop = (acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    multiple: true,
  });

  const handleClick = () => inputRef.current?.click();

  // Scroll to the left when files are updated
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [files]);

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap gap-2 w-full overflow-x-auto scrollbar-none my-4"
    >
      {files?.map((file, index) => (
        <div
          key={index}
          className="relative inline-block border-2 border-gray-600 w-44 h-56 rounded-md overflow-hidden"
        >
          {loading ? (
            <Spinner />
          ) : (
            <Image
              src={file}
              alt={`Uploaded image ${index + 1}`}
              width={500}
              height={500}
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={() => removeFile(productId, index, files)}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}

      <div
        {...getRootProps()}
        className={`relative inline-flex items-center justify-center border-2 border-dashed
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-600 hover:bg-gray-50"
          }
          w-44 h-56 rounded-md cursor-pointer transition-colors`}
      >
        <input {...getInputProps()} ref={inputRef} className="hidden" />
        <div className="text-center">
          <AttachFile className="mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? "Drop files here"
              : "Drag and drop files here, or click to select"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FilesUploader;
