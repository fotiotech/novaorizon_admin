import React, { useEffect, useRef } from "react";

// Hook to detect clicks outside of a specified DOM node
export default function useClickOutside(handler: () => void) {
  const domNode = useRef<HTMLDivElement>(null); // Changed to HTMLElement for general use

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (domNode.current && !domNode.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handler]); // Include handler in the dependency array

  return domNode;
}

// Hook to hide an element on click
export const useClickAndHide = (handler: () => void) => {
  const domNode = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleClick() {
      handler();
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [handler]); // Include handler in the dependency array

  return domNode;
};

// Hook to handle screen resize events
export const useScreenSize = (handler: () => void) => {
  useEffect(() => {
    const handleResize = () => {
      handler();
    };

    window.addEventListener("resize", handleResize);

    handleResize(); // Call handler initially

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handler]); // Include handler in the dependency array
};
