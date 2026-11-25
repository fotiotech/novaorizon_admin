import api from "@/lib/api";

export interface SecretField {
  key: string;
  label: string;
  group: string;
  hint?: string;
  configured: boolean;
  preview: string;
}

export async function getIntegrationSecrets(): Promise<SecretField[]> {
  const res = await api.get<{ data: { groups: SecretField[] } }>(
    "/integrations/secrets",
  );
  return Array.isArray(res.data?.data?.groups)
    ? res.data.data.groups
    : [];
}

export async function updateIntegrationSecrets(
  values: Record<string, string>,
): Promise<{ updated: string[]; note?: string }> {
  const res = await api.put<{
    updated: string[];
    note?: string;
  }>("/integrations/secrets", { values });
  return res.data;
}
