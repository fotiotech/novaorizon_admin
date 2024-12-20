import React, { useEffect, useState } from "react";
import ImageRenderer from "./ImageRenderer";

interface DetailImagesProps {
  file?: string[];
}

const DetailImages: React.FC<DetailImagesProps> = ({ file }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const slideToIndex = (direction: "left" | "right") => {
    setCurrentImageIndex((prevIndex) => {
      const newIndex =
        direction === "right"
          ? (prevIndex + 1) % file?.length!
          : (prevIndex - 1 + file?.length!) % file?.length!;

      return newIndex;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % file?.length!);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentImageIndex, file?.length!]);

  const dotIndex = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Navigation Arrows */}
      <div
        className="absolute z-10 flex justify-between items-center 
                px-2 lg:px-4 bottom-1/2 transform translate-y-1/2 
                opacity-60 hover:opacity-100 transition-opacity duration-300 
                left-0 w-full pointer-events-none"
      >
        <img
          title="Click left"
          src="/271220.png"
          onClick={() => slideToIndex("left")}
          className="pointer-events-auto lg:w-10 lg:h-10 w-6 h-6 cursor-pointer 
                 hover:scale-110 transition-transform duration-200"
        />
        <img
          title="Click right"
          src="/271228.png"
          onClick={() => slideToIndex("right")}
          className="pointer-events-auto lg:w-10 lg:h-10 w-6 h-6 cursor-pointer 
                 hover:scale-110 transition-transform duration-200"
        />
      </div>

      {/* Image Slider */}
      <div className="whitespace-nowrap bg-gray-100 transition-transform duration-500 ease-in-out overflow-hidden">
        {file &&
          file.map((image, index) => (
            <div
              key={index}
              className="inline-block w-full"
              style={{
                transform: `translateX(-${currentImageIndex * 100}%)`,
              }}
            >
              <ImageRenderer image={image} />
            </div>
          ))}
      </div>

      {/* Dots Navigation */}
      <div className="flex justify-center items-center gap-2 lg:gap-4 w-full h-14 bg-gray-200 bg-opacity-50">
        {file &&
          file.map((image, index) => (
            <span
              key={index}
              onClick={() => dotIndex(index)}
              className={`${
                index === currentImageIndex
                  ? "bg-blue-500 px-2 rounded-xl"
                  : "bg-gray-400 rounded-full"
              } cursor-pointer p-1 lg:w-4 lg:h-4  
            transition-all duration-300 transform hover:scale-150`}
            ></span>
          ))}
      </div>
    </div>
  );
};

export default DetailImages;
