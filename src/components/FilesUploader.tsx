import React, { useEffect, useRef } from "react";
import { AttachFile, Add } from "@mui/icons-material";
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    multiple: true,
    noClick: true, // We'll handle clicks manually
  });

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [files]);

  const handleRemove = async (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

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
    <div className="w-full my-4">
      <div
        ref={containerRef}
        className="whitespace-nowrap w-full overflow-x-auto scrollbar-none"
      >
        <div className="whitespace-nowrap inline-block">
          {files?.map((fileUrl, index) => {
            const fileName = fileUrl.split("/").pop() || "";
            const uploadProgress = progressByName[fileName];
            const isUploading =
              uploadProgress !== undefined && uploadProgress < 100;

            return (
              <div
                key={index}
                className="relative inline-block mr-2 border-2 border-gray-300 w-44 h-56 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-gray-100">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {uploadProgress}%
                    </span>
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
                  type="button"
                  onClick={(e) => handleRemove(e, index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                  disabled={isUploading}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div
          {...getRootProps()}
          className={`relative inline-block border-2 border-dashed
            ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }
            w-44 h-56 rounded-md cursor-pointer transition-colors bg-white`}
          onClick={open} // Manually trigger file selection
        >
          <div className="flex items-center justify-center ">
            <input {...getInputProps()} />
            <div className="text-center px-2 flex flex-col items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-3">
                <Add className="text-2xl" />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {isDragActive ? "Drop images here" : "Click to select images"}
              </p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
              <p className="text-xs text-gray-400 mt-2">JPEG, PNG, GIF</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesUploader;
