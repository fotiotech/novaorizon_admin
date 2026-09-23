"use client";

import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import CloseIcon from "@mui/icons-material/Close";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Mobile-first bottom sheet. Slides up from the bottom edge, uses
 * Headless UI's Dialog for focus trap + Escape + backdrop click.
 * Respects iOS safe-area inset at the bottom.
 */
export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel className="w-full max-w-xl max-h-[85vh] rounded-t-2xl border-t border-border bg-card shadow-xl">
                {/* Drag handle */}
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 -mr-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    aria-label="Close"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>

                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] h-full  overflow-y-auto">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
