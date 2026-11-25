"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import {
  getIntegrationSecrets,
  updateIntegrationSecrets,
  type SecretField,
} from "@/lib/api/integration";

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

export default function SecretsPage() {
  const [fields, setFields] = useState<SecretField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setFields(await getIntegrationSecrets());
    } catch {
      toast.error("Could not load integration secrets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, SecretField[]>();
    for (const field of fields) {
      if (!map.has(field.group)) map.set(field.group, []);
      map.get(field.group)!.push(field);
    }
    return [...map.entries()];
  }, [fields]);

  const save = async () => {
    const patch = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim() !== ""),
    );
    if (Object.keys(patch).length === 0) {
      toast.error("Enter at least one new value");
      return;
    }
    setSaving(true);
    try {
      const result = await updateIntegrationSecrets(patch);
      setValues({});
      setNote(result.note ?? null);
      toast.success(`Updated ${result.updated.length} secret(s)`);
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Could not update integration secrets",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-5">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          Integration secrets
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stored in AWS Secrets Manager and loaded into the API at boot.
          Existing values are never returned — only a masked preview.
        </p>
      </header>

      {note && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          {note}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([group, entries]) => (
            <section
              key={group}
              className="space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <h2 className="text-sm font-semibold text-foreground">{group}</h2>
              {entries.map((field) => (
                <label
                  key={field.key}
                  className="block text-[13px] font-medium text-foreground"
                >
                  {field.label}
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {field.configured
                      ? `configured · ${field.preview}`
                      : "not configured"}
                  </span>
                  <input
                    className={`${INPUT} mt-1`}
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                      field.configured
                        ? "Enter a new value to replace"
                        : "Paste value"
                    }
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </section>
          ))}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Save fontSize="small" />
            {saving ? "Saving…" : "Save secrets"}
          </button>
        </div>
      )}
    </div>
  );
}
