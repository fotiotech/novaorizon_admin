"use client";

import React, { useRef, useState } from "react";
import { Add, Close, Image as ImageIcon } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Modal } from "@/components/ux/Modal";

type FilesUploaderProps = {
  files: string[];
  addFiles: (newFiles: File[]) => void;
  onRemove: (index: number, fileUrl: string) => Promise<any>;
  loading?: boolean;
  progressByName?: Record<string, number>;
  /** When true, renders a single small thumbnail that opens the modal. */
  compact?: boolean;
};

const MAX_VISIBLE = 2;
const ACCEPT = { "image/*": [".jpeg", ".jpg", ".png", ".gif"] };

const FilesUploader: React.FC<FilesUploaderProps> = ({
  files,
  addFiles,
  onRemove,
  progressByName = {},
  compact = false,
}) => {
  const fileArray = Array.isArray(files) ? files : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
    noClick: true,
  });

  const getProgress = (url: string) => {
    const fileName = url.split("/").pop() || "";
    return progressByName[fileName];
  };

  const handleRemove = async (
    e: React.MouseEvent,
    index: number,
    fileUrl: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const progress = getProgress(fileUrl);
    if (progress !== undefined && progress < 100) {
      alert("Please wait for the upload to complete before removing the file");
      return;
    }

    if (!window.confirm("Remove this image?")) return;

    try {
      await onRemove(index, fileUrl);
    } catch (error) {
      console.error("Remove failed:", error);
      alert((error as Error).message || "Failed to remove image");
    }
  };

  const handleModalAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (picked && picked.length > 0) {
      addFiles(Array.from(picked));
      e.target.value = "";
    }
  };

  const total = fileArray.length;
  const visibleImages = fileArray
    .slice(0, MAX_VISIBLE)
    .map((url, index) => ({ url, index }));
  const remaining = Math.max(0, total - MAX_VISIBLE);

  // ------------------------------------------------------------------
  // Tile renderers
  // ------------------------------------------------------------------
  const renderAddTile = () => (
    <button
      type="button"
      onClick={open}
      className="group flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card/60 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
        <Add fontSize="small" />
      </span>
      <span className="text-xs font-medium text-foreground">Add images</span>
      <span className="hidden text-[10px] text-muted-foreground sm:block">
        JPEG, PNG, GIF
      </span>
    </button>
  );

  const renderImageTile = (
    slot: { url: string; index: number },
    showOverlay = false,
  ) => {
    const { url, index } = slot;
    const progress = getProgress(url);
    const isUploading = progress !== undefined && progress < 100;

    return (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label={
          showOverlay ? `View all ${total} images` : `View image ${index + 1}`
        }
        className="group relative h-full w-full overflow-hidden rounded-xl border border-border bg-muted"
      >
        {isUploading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        ) : (
          <Image
            src={url}
            alt={`Image ${index + 1}`}
            fill
            sizes="(max-width: 768px) 40vw, 240px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {showOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-[1px]">
            <span className="text-lg font-semibold">+{remaining}</span>
            <span className="text-[10px] opacity-90">more</span>
          </div>
        )}
      </button>
    );
  };

  // ------------------------------------------------------------------
  // Compact trigger — sized for a table cell
  // ------------------------------------------------------------------
  const renderCompactTrigger = () => {
    const firstUrl = fileArray[0];
    const progress = firstUrl ? getProgress(firstUrl) : undefined;
    const isUploading = progress !== undefined && progress < 100;

    // Empty: dashed "+" button that opens the file picker directly
    if (total === 0) {
      return (
        <button
          type="button"
          onClick={open}
          title="Add images"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border bg-card/60 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
        >
          <Add fontSize="small" />
        </button>
      );
    }

    // Has images: thumbnail + count badge, opens modal
    return (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        title={`Manage ${total} ${total === 1 ? "image" : "images"}`}
        className="group relative inline-flex h-10 w-10 overflow-hidden rounded-lg border border-border bg-muted"
      >
        {isUploading ? (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted-foreground">
            {progress}%
          </span>
        ) : (
          <Image
            src={firstUrl}
            alt="Variant image"
            fill
            sizes="40px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {total > 1 && !isUploading && (
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[10px] font-semibold leading-4 text-white">
            +{total - 1}
          </span>
        )}
      </button>
    );
  };

  // ------------------------------------------------------------------
  // Modal (shared by both variants)
  // ------------------------------------------------------------------
  const modal = (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Manage images"
      size="lg"
    >
      <div className="flex max-h-[70vh] flex-col gap-4">
        <div className="flex flex-none items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? "image" : "images"}
          </span>
          <button
            type="button"
            onClick={() => modalInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add style={{ fontSize: 16 }} />
            Add images
          </button>
          <input
            ref={modalInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            multiple
            className="hidden"
            onChange={handleModalAdd}
          />
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No images yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &ldquo;Add images&rdquo; to get started.
            </p>
          </div>
        ) : (
          <div className="-mr-2 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fileArray.map((url, index) => {
                const progress = getProgress(url);
                const isUploading =
                  progress !== undefined && progress < 100;

                return (
                  <div
                    key={`${url}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    {isUploading ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {progress}%
                        </span>
                      </div>
                    ) : (
                      <Image
                        src={url}
                        alt={`Image ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 45vw, 200px"
                        className="object-cover"
                      />
                    )}

                    {!isUploading && (
                      <button
                        type="button"
                        onClick={(e) => handleRemove(e, index, url)}
                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive focus:opacity-100 group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <Close style={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  // ------------------------------------------------------------------
  // Compact mode — table cell friendly
  // ------------------------------------------------------------------
  if (compact) {
    return (
      <>
        {renderCompactTrigger()}
        {modal}
      </>
    );
  }

  // ------------------------------------------------------------------
  // Full bento mode
  // ------------------------------------------------------------------
  return (
    <>
      <div
        {...getRootProps()}
        className={`relative my-4 w-full max-w-[280px] transition-all sm:max-w-[320px] md:max-w-[360px] ${
          isDragActive
            ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
            : ""
        }`}
      >
        <input {...getInputProps()} />

        {total === 0 && (
          <div className="h-[110px] sm:h-[120px] md:h-[130px]">
            {renderAddTile()}
          </div>
        )}

        {total === 1 && (
          <div className="grid h-[110px] grid-cols-2 gap-1.5 sm:h-[120px] sm:gap-2 md:h-[130px]">
            {renderImageTile(visibleImages[0])}
            {renderAddTile()}
          </div>
        )}

        {total >= 2 && (
          <div className="grid h-[130px] grid-cols-3 grid-rows-2 gap-1.5 sm:h-[145px] sm:gap-2 md:h-[160px]">
            <div className="col-span-2 row-span-2">
              {renderImageTile(visibleImages[0])}
            </div>
            <div className="col-span-1 row-span-1">
              {renderImageTile(visibleImages[1], remaining > 0)}
            </div>
            <div className="col-span-1 row-span-1">{renderAddTile()}</div>
          </div>
        )}

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-primary/10 backdrop-blur-sm">
            <p className="text-xs font-medium text-primary sm:text-sm">
              Drop images here
            </p>
          </div>
        )}
      </div>

      {modal}
    </>
  );
};

export default FilesUploader;