"use client";

import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Opt-in: full-screen sheet on mobile (< sm breakpoint).
   * On desktop it stays a centered panel constrained by `size`.
   * Defaults to `false` so existing usages are byte-for-byte unchanged.
   */
  fullScreenOnMobile?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  size = "lg",
  fullScreenOnMobile = false,
}: ModalProps) => {
  const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  };

  // ── Original path: untouched for all existing callers ─────────
  if (!fullScreenOnMobile) {
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
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl border border-border bg-card p-4 text-left align-middle shadow-xl transition-all sm:p-6`}
                >
                  {title && (
                    <Dialog.Title
                      as="h3"
                      className="mb-4 text-lg font-semibold leading-6 text-foreground"
                    >
                      {title}
                    </Dialog.Title>
                  )}
                  {children}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // ── Opt-in full-screen-on-mobile path ─────────────────────────
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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={[
                  "relative flex w-full flex-col overflow-hidden bg-card text-left align-middle shadow-xl transition-all",
                  // Mobile: full-screen sheet
                  "h-[100dvh] max-h-none rounded-none border-0 p-4",
                  // Desktop (sm+): centered, rounded, width-constrained
                  "sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-border sm:p-6",
                  sizeClasses[size],
                ].join(" ")}
              >
                {/* Close (X) — always visible, top-right */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:right-4 sm:top-4"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {title && (
                  <Dialog.Title
                    as="h3"
                    className="mb-4 shrink-0 pr-10 text-lg font-semibold leading-6 text-foreground"
                  >
                    {title}
                  </Dialog.Title>
                )}

                {/* Body scrolls internally so the title + X stay pinned */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
