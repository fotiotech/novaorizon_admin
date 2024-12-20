import Image from "next/image";
import React from "react";

interface ImageRendererProps {
  image?: string;
}

const ImageRenderer = ({ image }: ImageRendererProps) => {
  const defaultImage = "/placeholder.png"; // Fallback image path

  // Determine class and rendering style based on file type
  const getImageStyle = (image: string | undefined) => {
    if (image?.includes(".png")) {
      return {
        className: "object-contain w-full h-full p-2",
        layout: "intrinsic",
      };
    } else if (
      image?.includes(".jpg") ||
      image?.includes(".jpeg") ||
      image?.includes(".webp") ||
      image?.includes(".avif")
    ) {
      return { className: "object-cover w-full h-full", layout: "responsive" };
    }
    return {
      className: "object-contain w-full h-full p-2",
      layout: "intrinsic",
    }; // Default style
  };

  const { className, layout } = getImageStyle(image);

  return (
    <Image
      src={image || defaultImage} // Use fallback if image is unavailable
      width={500}
      height={500}
      alt={image ? `Rendered image: ${image}` : "Default placeholder image"}
      loading="lazy"
      className={`w-full h-full ${className}`}
      layout={layout}
    />
  );
};

export default ImageRenderer;
