// app/marketing/content/navigation/page.tsx
import Link from "next/link";
import {
  ArrowForward,
  MenuOpen,
  Image as ImageIcon,
  Search,
} from "@mui/icons-material";

const sections = [
  {
    href: "/marketing/content/navigation/menus",
    label: "Navigation / Menus",
    description:
      "Build and manage the menus that shape how customers find their way around your store.",
    icon: <MenuOpen fontSize="small" />,
  },
  {
    href: "/marketing/content/hero_content",
    label: "Hero Content",
    description:
      "Curate the banners and featured visuals that greet customers on your storefront.",
    icon: <ImageIcon fontSize="small" />,
  },
  {
    href: "/marketing/content/seo",
    label: "SEO Settings",
    description:
      "Control the metadata search engines and social platforms use to describe your site.",
    icon: <Search fontSize="small" />,
  },
];

export default function AppPage() {
  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* Controls row — no title (top bar renders the page name) */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          Pick a section to manage its content.
        </p>
      </div>

      {/* Section list */}
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {section.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {section.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {section.description}
                </p>
              </div>

              <ArrowForward
                sx={{ fontSize: 16 }}
                className="shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
