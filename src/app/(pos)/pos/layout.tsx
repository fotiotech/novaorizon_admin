import type { ReactNode } from "react";

export const metadata = {
  title: "Point of Sales",
  description: "Point of Sales dashboard layout",
};

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-6">
          <div className="mb-10 text-2xl font-semibold">POS</div>
          <nav className="space-y-3 text-sm text-slate-700">
            <a
              href="#"
              className="block rounded-xl px-4 py-3 hover:bg-slate-100"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="block rounded-xl px-4 py-3 hover:bg-slate-100"
            >
              Sales
            </a>
            <a
              href="#"
              className="block rounded-xl px-4 py-3 hover:bg-slate-100"
            >
              Products
            </a>
            <a
              href="#"
              className="block rounded-xl px-4 py-3 hover:bg-slate-100"
            >
              Customers
            </a>
            <a
              href="#"
              className="block rounded-xl px-4 py-3 hover:bg-slate-100"
            >
              Reports
            </a>
          </nav>
        </aside>

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Point of Sales</p>
              <h1 className="text-2xl font-semibold">Store overview</h1>
            </div>
          </div>
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
