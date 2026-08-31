// components/FilesUploader.tsx
import React, { useEffect, useRef } from "react";
import { Add } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

type FilesUploaderProps = {
  files: string[];
  addFiles: (newFiles: File[]) => void;
  onRemove: (index: number, fileUrl: string) => Promise<any>; // 👈 returns any, not void
  loading?: boolean;
  progressByName?: Record<string, number>;
};

const FilesUploader: React.FC<FilesUploaderProps> = ({
  files,
  addFiles,
  onRemove,
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
    noClick: true,
  });

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [files]);

  const handleRemove = async (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const fileUrl = files[index];
    if (!fileUrl) return;

    const fileName = fileUrl.split("/").pop() || "";
    const isUploading =
      progressByName[fileName] !== undefined && progressByName[fileName] < 100;

    if (isUploading) {
      alert("Please wait for the upload to complete before removing the file");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this image?")) return;

    try {
      await onRemove(index, fileUrl);
      // Parent updates its state, so we don't modify files here.
    } catch (error) {
      console.error("Remove failed:", error);
      alert((error as Error).message || "Failed to remove image");
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden my-4">
      <div
        ref={containerRef}
        className="flex overflow-x-auto overflow-y-hidden gap-4 pb-2 scroll-smooth"
        style={{
          scrollbarWidth: "thin",
          scrollSnapType: "x mandatory",
        }}
      >
        {files?.map((fileUrl, index) => {
          const fileName = fileUrl.split("/").pop() || "";
          const uploadProgress = progressByName[fileName];
          const isUploading =
            uploadProgress !== undefined && uploadProgress < 100;

          return (
            <div
              key={index}
              className="relative flex-shrink-0 w-44 h-44 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md"
              style={{ scrollSnapAlign: "start" }}
            >
              {isUploading ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-muted p-4">
                  <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {uploadProgress}%
                  </span>
                </div>
              ) : (
                <Image
                  src={fileUrl}
                  alt={`Uploaded image ${index + 1}`}
                  width={176}
                  height={176}
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => handleRemove(e, index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-destructive-foreground shadow-md transition-transform hover:scale-105"
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
          className={`flex h-44 w-44 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed bg-card/60 text-center transition-all duration-200 ${
            isDragActive
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border hover:border-primary/60 hover:bg-primary/5"
          }`}
          onClick={open}
        >
          <input {...getInputProps()} />
          <div className="px-2">
            <div className="mb-3 inline-flex rounded-full bg-primary/10 p-3 text-primary">
              <Add className="text-2xl" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Drop images here" : "Click to select images"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or drag and drop
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              JPEG, PNG, GIF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesUploader;
