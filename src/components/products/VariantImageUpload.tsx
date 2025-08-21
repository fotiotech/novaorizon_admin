import React from "react";
import { useFileUploader } from "@/hooks/useFileUploader";
import FilesUploader from "@/components/FilesUploader";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";

interface VariantImageUploaderProps {
  productId: string;
  index: number;
}

const VariantImageUploader: React.FC<VariantImageUploaderProps> = ({
  productId,
  index,
}) => {
  const dispatch = useAppDispatch();
  const { files, loading, addFiles, removeFile } = useFileUploader();

  // Update Redux when files change
  React.useEffect(() => {
    if (files.length > 0) {
      const path = `variants_options.variants.${index}.main_image`;
      dispatch(
        addProduct({
          _id: productId,
          path,
          value: files[0],
        })
      );
    }
  }, [files, dispatch, productId]);

  return <FilesUploader
      files={files}
      loading={loading}
      addFiles={addFiles}
      removeFile={removeFile}
    />;
};

export default VariantImageUploader;
