import Link from "next/link";

export default function AppPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        App Content Sections
      </h2>
      <ul className="space-y-2">
        <li>
          <Link
            href="/marketing/content/navigation"
            className="block p-4 bg-card border border-border rounded-lg hover:bg-muted/50 hover:shadow-md transition-all duration-200 text-foreground"
          >
            Navigation / Menus
          </Link>
        </li>
        <li>
          <Link
            href="/marketing/content/hero_content"
            className="block p-4 bg-card border border-border rounded-lg hover:bg-muted/50 hover:shadow-md transition-all duration-200 text-foreground"
          >
            Hero Content
          </Link>
        </li>
        <li>
          <Link
            href="/marketing/content/seo"
            className="block p-4 bg-card border border-border rounded-lg hover:bg-muted/50 hover:shadow-md transition-all duration-200 text-foreground"
          >
            SEO settings
          </Link>
        </li>
      </ul>
    </div>
  );
}
