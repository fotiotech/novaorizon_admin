"use client";

import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import CloseIcon from "@mui/icons-material/Close";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: string;
}

export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  height,
}: BottomSheetProps) => {
  const isFixedHeight = typeof height === "string" && height.length > 0;

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
              <Dialog.Panel
                className={`flex w-full max-w-xl flex-col rounded-t-2xl border-t border-border bg-card shadow-xl ${
                  isFixedHeight ? "" : "max-h-[85vh]"
                }`}
                style={isFixedHeight ? { height } : undefined}
              >
                <div className="flex flex-none justify-center pb-1 pt-3">
                  <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="flex flex-none items-center justify-between border-b border-border px-4 pb-3">
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1.5 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>

                {/*
                  Fixed-height sheets: flex-1 + min-h-0 lets the body
                  fill the space between header and the panel bottom.
                  overflow-hidden (not -y-auto) so inner components
                  own their own scroll — the editor keeps its toolbar
                  pinned and scrolls only its content.
                */}
                <div
                  className={`p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
                    isFixedHeight ? "min-h-0 flex-1 overflow-hidden" : ""
                  }`}
                >
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
