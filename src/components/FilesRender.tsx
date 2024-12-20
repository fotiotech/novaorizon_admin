// // components/FilesRender.tsx
// import React, { useEffect } from "react";

// interface ImageRendererProps {
//   image?: File;
// }

// const FilesRender: React.FC<ImageRendererProps> = ({ image }) => {
//   // Render the image based on its file type
//   const renderImage = () => {
//     if (!image) return null;

//     // Create a blob URL for the image
//     const imageUrl = URL.createObjectURL(image);

//     // Determine the styling and rendering based on the file extension
//     if (image.type.includes("image/png")) {
//       return (
//         <img
//           title="image"
//           src={imageUrl}
//           width={50}
//           height={50}
//           alt="image"
//           className="w-full h-full object-contain p-2"
//         />
//       );
//     } else if (
//       image.type.includes("image/jpg") ||
//       image.type.includes("image/jpeg")
//     ) {
//       return (
//         <img
//           title="image"
//           src={imageUrl}
//           width={50}
//           height={50}
//           alt="image"
//           className="w-full h-full object-cover"
//         />
//       );
//     } else if (image.type.includes("image/webp")) {
//       return (
//         <img
//           title="image"
//           src={imageUrl}
//           width={50}
//           height={50}
//           alt="image"
//           className="w-full h-full object-cover"
//         />
//       );
//     }
//     return null;
//   };

//   // Render the chosen image type
//   return <>{renderImage()}</>;
// };

// export default FilesRender;
