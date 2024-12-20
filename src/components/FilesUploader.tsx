// FilesUploader.tsx
import React, { useEffect, useRef } from "react";
import { AttachFile } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { useFileUploader } from "@/hooks/useFileUploader ";
import Spinner from "./Spinner";

type FilesUploaderProps = {
  files: string[];
  addFiles: (newFiles: File[]) => void;
};

const FilesUploader: React.FC<FilesUploaderProps> = ({ files, addFiles }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { loading, removeFile } = useFileUploader();

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

  return (
    <div className="whitespace-nowrap w-full overflow-clip overflow-x-auto scrollbar-none my-4 space-x-3">
      {files.map((file, index) => (
        <div
          key={index}
          className="relative inline-block border-2 border-gray-600 w-44 h-56 rounded-md overflow-hidden"
        >
          {loading ? (
            <Spinner />
          ) : (
            <Image
              src={file}
              alt={`Uploaded file ${index + 1}`}
              width={500}
              height={500}
              className="h-full w-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => removeFile(index, files)}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
            title="Remove Image"
          >
            ✕
          </button>
        </div>
      ))}

      <div
        className={`${
          files.length > 0 ? "w-60 border-thiR" : "w-full border-gray-600"
        } border-2 h-56 align-top p-4 rounded-md text-center inline-block`}
      >
        <div
          {...getRootProps()}
          className={`p-6 ${
            isDragActive ? "border-blue-500" : "border-gray-400"
          }`}
        >
          <input {...getInputProps()} ref={inputRef} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <div>
              <AttachFile style={{ fontSize: 32 }} />
              <p className="text-wrap">Drag and drop some images here</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Select Images
        </button>
      </div>
    </div>
  );
};

export default FilesUploader;
