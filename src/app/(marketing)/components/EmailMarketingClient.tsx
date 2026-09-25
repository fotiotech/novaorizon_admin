// app/marketing/email_marketing/EmailMarketingClient.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTemplate, deleteTemplate } from "@/app/actions/campaigns";

type Channel = "email" | "sms";

interface TemplateLite {
  _id: string;
  name: string;
  channel: Channel;
  subject?: string;
  body: string;
  isActive: boolean;
  createdAt?: string;
}

interface CampaignLite {
  _id: string;
  name: string;
  channel: Channel;
  status: string;
  scheduledFor?: string | null;
  stats?: { total?: number; sent?: number; opened?: number };
  createdAt?: string;
}

interface Counts {
  all: number;
  subscribed: number;
  unsubscribed: number;
  bounced: number;
}

interface Props {
  templates: TemplateLite[];
  campaigns: CampaignLite[];
  campaignsTotal: number;
  counts: Counts;
}

// ─── Tokens (match the promotion pages) ──────────────────────────────
const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/10 text-amber-600",
  sending: "bg-blue-500/10 text-blue-600",
  sent: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function relativeTime(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function EmailMarketingClient({
  templates,
  campaigns,
  campaignsTotal,
  counts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    channel: "email" as Channel,
    subject: "",
    body: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () =>
    setForm({ name: "", channel: "email", subject: "", body: "" });

  const handleCreate = () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Template name is required.");
      return;
    }
    if (!form.body.trim()) {
      setFormError("Body content is required.");
      return;
    }
    if (form.channel === "email" && !form.subject.trim()) {
      setFormError("Email templates require a subject line.");
      return;
    }

    startTransition(async () => {
      try {
        await createTemplate({
          name: form.name.trim(),
          channel: form.channel,
          subject: form.channel === "email" ? form.subject.trim() : undefined,
          body: form.body,
        });
        toast.success("Template created");
        resetForm();
        router.refresh();
      } catch (err: any) {
        const msg = err?.message ?? "Failed to create template";
        setFormError(msg);
        toast.error(msg);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteTemplate(id);
        toast.success("Template deleted");
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to delete");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header / overview ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">
              {counts.subscribed}
            </span>{" "}
            subscribed
          </span>
          <span>
            <span className="font-semibold text-foreground">
              {templates.length}
            </span>{" "}
            {templates.length === 1 ? "template" : "templates"}
          </span>
          <span>
            <span className="font-semibold text-foreground">
              {campaignsTotal}
            </span>{" "}
            {campaignsTotal === 1 ? "campaign" : "campaigns"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketing/email_marketing/suscribers"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted"
          >
            Subscribers
          </Link>
          <Link
            href="/marketing/email_marketing/campaigns/create"
            className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            New campaign
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left column — templates list ─────────────────────── */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Templates</CardTitle>
                <CardDescription>
                  Reusable email and SMS bodies for your campaigns
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <div className="px-6 pb-6 pt-2 text-center">
                  <p className="text-[14px] font-medium text-foreground">
                    No templates yet
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Create one on the right to get started.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {templates.map((t) => (
                    <li
                      key={t._id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[14px] font-medium text-foreground">
                            {t.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                            {t.channel}
                          </span>
                          {!t.isActive && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              inactive
                            </span>
                          )}
                        </div>
                        {t.subject && (
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {t.subject}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Created {relativeTime(t.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/marketing/email_marketing/templates/${t._id}`}
                          className="text-[13px] font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(t._id, t.name)}
                          className="text-[13px] font-medium text-destructive hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Recent campaigns</CardTitle>
                <CardDescription>
                  Last {campaigns.length} of {campaignsTotal}
                </CardDescription>
              </div>
              {campaignsTotal > campaigns.length && (
                <Link
                  href="/marketing/email_marketing/campaigns"
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  View all
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {campaigns.length === 0 ? (
                <div className="px-6 pb-6 pt-2 text-center">
                  <p className="text-[14px] font-medium text-foreground">
                    No campaigns yet
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Send your first campaign to {counts.subscribed} subscribers.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <li
                      key={c._id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/marketing/email_marketing/campaigns/${c._id}`}
                            className="truncate text-[14px] font-medium text-foreground hover:underline"
                          >
                            {c.name}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                              STATUS_TONE[c.status] ??
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {c.stats?.sent ?? 0} sent
                          {c.stats?.total ? ` · ${c.stats.total} total` : ""}
                          {" · "}
                          {relativeTime(c.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column — create template ───────────────────── */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>New template</CardTitle>
              <CardDescription>
                Design a reusable email or SMS body
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                  {formError}
                </div>
              )}

              <div>
                <label className={labelCls}>
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g., Welcome email"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Channel <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["email", "sms"] as Channel[]).map((ch) => {
                    const selected = form.channel === ch;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, channel: ch }))}
                        className={`rounded-lg border px-3 py-2 text-[13px] font-medium capitalize transition ${
                          selected
                            ? "border-primary/50 bg-primary/5 text-foreground"
                            : "border-border bg-background text-foreground/80 hover:bg-muted/40"
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.channel === "email" && (
                <div>
                  <label className={labelCls}>
                    Subject <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.subject}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subject: e.target.value }))
                    }
                    placeholder="e.g., Welcome to Novaorizon"
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>
                  Body <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={form.body}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, body: e.target.value }))
                  }
                  placeholder={
                    form.channel === "email"
                      ? "Hi {{firstName}},\n\nThanks for joining us…"
                      : "Hi {{firstName}}, your code is {{code}}"
                  }
                  className="min-h-[180px] font-mono text-[13px]"
                />
                <p className={helperCls}>
                  Use{" "}
                  <code className="rounded bg-muted px-1">
                    {"{{firstName}}"}
                  </code>{" "}
                  for variables. An unsubscribe link is added automatically to
                  email sends.
                </p>
              </div>

              <Button
                onClick={handleCreate}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? "Creating…" : "Create template"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
