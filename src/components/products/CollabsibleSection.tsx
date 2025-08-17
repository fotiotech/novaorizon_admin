import React, { ReactNode, useState } from "react";

interface CollapsibleSectionProps {
  children: ReactNode;
}

/**
 * A box with a clickable header. Clicking toggles open/closed.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex justify-end items-center px-4 text-right focus:outline-none"
      >
        <span className="text-xl leading-none">{isOpen ? "−" : "+"}</span>
      </button>

      {/* Body (only visible when isOpen) */}
      {isOpen && <div className="">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
