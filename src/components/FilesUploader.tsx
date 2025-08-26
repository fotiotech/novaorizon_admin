import React, { useEffect, useRef } from "react";
import { AttachFile } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

type FilesUploaderProps = {
  productId?: string;
  files: string[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (
    productId: string,
    index: number,
    filesContent?: string[]
  ) => Promise<{ success: boolean; message?: string }>;
  loading?: boolean;
  progressByName?: Record<string, number>;
};

const FilesUploader: React.FC<FilesUploaderProps> = ({
  productId,
  files,
  addFiles,
  removeFile,
  loading = false,
  progressByName = {},
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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [files]);

  const handleRemove = async (e: React.MouseEvent, index: number) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent any other event handlers

    if (!productId) {
      console.error("Product ID is required to remove files");
      return;
    }

    const fileName = files[index]?.split("/").pop() || "";
    const isUploading =
      progressByName[fileName] !== undefined && progressByName[fileName] < 100;

    if (isUploading) {
      alert("Please wait for the upload to complete before removing the file");
      return;
    }

    try {
      const result = await removeFile(productId, index, files);
      if (!result?.success) {
        console.error("Failed to remove file:", result?.message);
      }
    } catch (error) {
      console.error("Error removing file:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap gap-2 w-full overflow-x-auto scrollbar-none my-4"
    >
      {files?.map((fileUrl, index) => {
        const fileName = fileUrl.split("/").pop() || "";
        const uploadProgress = progressByName[fileName];
        const isUploading =
          uploadProgress !== undefined && uploadProgress < 100;

        return (
          <div
            key={index}
            className="relative inline-block border-2 border-gray-600 w-44 h-56 rounded-md overflow-hidden"
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center w-full h-full p-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
            ) : (
              <Image
                src={fileUrl}
                alt={`Uploaded image ${index + 1}`}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            )}
            <button
              type="button" // Explicitly set button type to prevent form submission
              onClick={(e) => handleRemove(e, index)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Remove image"
              disabled={isUploading}
            >
              ×
            </button>
          </div>
        );
      })}

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
