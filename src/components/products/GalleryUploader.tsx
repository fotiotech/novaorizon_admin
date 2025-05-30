import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct, updateVariants } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface MainImageUploaderProps {
  productId: string;
}

const GalleryUploader: React.FC<MainImageUploaderProps> = ({ productId }) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          path: "media_visuals.gallery",
          value: files,
        })
      );
    }
  }, [files, dispatch, productId]);

  return <FilesUploader files={files} addFiles={addFiles} />;
};

export default GalleryUploader;
