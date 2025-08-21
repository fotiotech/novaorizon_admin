import React, { useEffect, useRef } from "react";
import { AttachFile } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

type StoredFile = {
  url: string;
  path: string; // storage path used to upload (useful for deletion)
};

type FilesUploaderProps = {
  productId: string;
  files: StoredFile[]; // now array of { url, path }
  addFiles: (newFiles: File[]) => void;
  removeFile: (
    productId: string,
    index: number,
    filesContent?: StoredFile[]
  ) => Promise<any> | void;
  loading?: boolean;
  instanceId?: string; // optional, if you need to namespace client-side
};

const FilesUploader: React.FC<FilesUploaderProps> = ({
  productId,
  files,
  addFiles,
  removeFile,
  loading = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
            // you can replace this with your Spinner component
            <div className="flex items-center justify-center w-full h-full">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            </div>
          ) : (
            <Image
              src={file.url}
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
        <div className="text-center px-2">
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
