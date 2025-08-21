import React, { ReactNode, useState } from "react";

interface CollapsibleSectionProps {
  name: string;
  children: ReactNode;
}

/**
 * A box with a clickable header. Clicking toggles open/closed.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  name,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">{name}</h2>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className=" px-4 text-right focus:outline-none"
        >
          <span className="text-xl leading-none">{isOpen ? "−" : "+"}</span>
        </button>
      </div>

      {/* Body (only visible when isOpen) */}
      {isOpen && <div className="">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
