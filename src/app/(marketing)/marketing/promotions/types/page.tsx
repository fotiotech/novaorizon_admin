// app/marketing/promotions/types/page.tsx
import { DeleteButton } from "@/app/(marketing)/components/DeleteButton";
import { listPromotionTypes } from "@/app/actions/promotionType";
import Link from "next/link";

export default async function PromotionTypesPage() {
  const { data: types, total } = await listPromotionTypes({}, { limit: 100 });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {total} {total === 1 ? "type" : "types"}
        </p>
        <Link
          href="/marketing/promotions/types/create"
          className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          New type
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Calculation</th>
              <th className="px-5 py-3">Properties</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {types.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <p className="text-[15px] font-medium text-foreground">
                    No promotion types yet
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Types define the calculation logic a promotion uses.
                  </p>
                </td>
              </tr>
            ) : (
              types.map((type: any) => (
                <tr key={type._id} className="transition hover:bg-muted/30">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {type.icon && (
                        <span className="text-base leading-none">
                          {type.icon}
                        </span>
                      )}
                      <span className="font-medium text-foreground">
                        {type.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-muted-foreground">
                    {type.code}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] capitalize text-muted-foreground">
                    {type.calculationType.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                    {type.properties?.length ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        type.isActive
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {type.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3 text-[13px]">
                      <Link
                        href={`/marketing/promotions/types/edit/${type._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={type._id} name={type.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
