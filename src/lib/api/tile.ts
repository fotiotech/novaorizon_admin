// lib/api/tile.ts
import api from "@/lib/api";

export interface TileDTO {
  _id: string;
  title: string;
  imageUrl?: string | null;
  link?: string | null;
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  status: "active" | "inactive";
  order: number;
}

export interface TileInput {
  title: string;
  imageUrl?: string;
  link?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  status: "active" | "inactive";
  order?: number;
}

export async function listTilesAdmin(): Promise<TileDTO[]> {
  const res = await api.get<{ data: TileDTO[] }>("/tiles/admin");
  return res.data.data ?? [];
}

export async function createTile(input: TileInput): Promise<TileDTO> {
  const res = await api.post<{ data: TileDTO }>("/tiles", input);
  return res.data.data;
}

export async function updateTile(id: string, input: TileInput): Promise<TileDTO> {
  const res = await api.patch<{ data: TileDTO }>(`/tiles/${id}`, input);
  return res.data.data;
}

export async function deleteTile(id: string): Promise<void> {
  await api.delete(`/tiles/${id}`);
}

export async function reorderTiles(orderedIds: string[]): Promise<void> {
  await api.post("/tiles/reorder", { orderedIds });
}