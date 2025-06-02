import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface MainImageUploaderProps {
  productId: string;
}

const MainImageUploader: React.FC<MainImageUploaderProps> = ({ productId }) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      dispatch(
        addProduct({
          _id: productId,
          path: "media_visuals.main_image",
          value: files[0],
        })
      );
    }
  }, [files, dispatch, productId]);

  return <FilesUploader files={files} addFiles={addFiles} />;
};

export default MainImageUploader;
