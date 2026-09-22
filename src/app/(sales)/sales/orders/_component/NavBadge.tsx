/* ------------------------------------------------------------------ */
/* Nav badge — shared by unread chat / contacts / orders counters      */
/* ------------------------------------------------------------------ */
export const NavBadge = ({
  count,
  tone = "destructive",
  title,
}: {
  count: number;
  tone?: "destructive" | "primary" | "info";
  title?: string;
}) => {
  if (!count || count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  const tones: Record<string, string> = {
    // Soft red — used for chat + orders
    destructive:
      "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25 dark:bg-destructive/15 dark:text-destructive dark:ring-destructive/30",
    // Brand primary — used for contacts
    primary:
      "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25 dark:bg-primary/15 dark:text-primary dark:ring-primary/30",
    // Neutral blue — alternative for info-style counters
    info: "bg-blue-500/10 text-blue-600 ring-1 ring-inset ring-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
  };

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums transition-transform duration-150 ease-out ${tones[tone]}`}
    >
      {label}
    </span>
  );
};
