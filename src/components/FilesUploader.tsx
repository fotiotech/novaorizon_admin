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
};

const FilesUploader: React.FC<FilesUploaderProps> = ({ files, addFiles }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // Ref for the container
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];

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

  // Scroll to the left when files are updated
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0; // Scroll to the left
    }
  }, [files]);

  return (
    <div
      ref={containerRef} // Attach the ref to the container
      className="flex flex-wrap gap-2 w-full overflow-x-auto scrollbar-none my-4"
    >
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
            onClick={() => removeFile(productId, index, files)}
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
