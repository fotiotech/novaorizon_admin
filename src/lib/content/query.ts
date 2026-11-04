// lib/content/query.ts
import mongoose from "mongoose";
import type { TargetType, ValueType } from "./collectionTypes";
import { getEntityConfig } from "./entityRegistry";

export interface Rule {
  attribute: string;
  operator: string;
  value: any;
  position: number;
}

function coerceScalar(value: any, valueType: ValueType | undefined): any {
  if (valueType === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return value;
  }
  if (valueType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (valueType === "date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  }
  return value;
}

function coerceByType(value: any, valueType: ValueType | undefined) {
  if (Array.isArray(value)) return value.map((v) => coerceScalar(v, valueType));
  return coerceScalar(value, valueType);
}

export function buildQueryFromRules(
  rules: Rule[] | undefined,
  targetType: TargetType,
): Record<string, any> {
  const cfg = getEntityConfig(targetType);
  if (!cfg || !rules?.length) return {};

  const attrs = new Map(cfg.attributes.map((a) => [a.value, a]));
  const query: Record<string, any> = {};

  for (const rule of rules) {
    if (!rule.attribute || !rule.operator) continue;
    const attrCfg = attrs.get(rule.attribute);
    let value = rule.value;

    if (attrCfg?.ref) {
      if (Array.isArray(value)) {
        value = value
          .map((v) =>
            mongoose.Types.ObjectId.isValid(v)
              ? new mongoose.Types.ObjectId(v)
              : null,
          )
          .filter(Boolean);
      } else if (
        typeof value === "string" &&
        mongoose.Types.ObjectId.isValid(value)
      ) {
        value = new mongoose.Types.ObjectId(value);
      }
    } else {
      value = coerceByType(value, attrCfg?.valueType);
    }

    if (rule.operator === "$in" || rule.operator === "$nin") {
      const arr = Array.isArray(value) ? value : [value];
      query[rule.attribute] = {
        ...(query[rule.attribute] ?? {}),
        [rule.operator]: arr,
      };
    } else {
      query[rule.attribute] = {
        ...(query[rule.attribute] ?? {}),
        [rule.operator]: value,
      };
    }
  }

  return query;
}

export function pickSlug(doc: any): string | null {
  if (!doc) return null;
  const candidate =
    doc.slug ??
    doc.url_slug ??
    doc.urlSlug ??
    (typeof doc.url === "string" && !/^https?:\/\//.test(doc.url)
      ? doc.url
      : null);
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

export function buildProductQueryFromScope(scope: any): Record<string, any> {
  const query: Record<string, any> = {};
  const appliesTo: string = scope?.appliesTo ?? "all";
  const toIds = (arr: any[] | undefined) =>
    (arr ?? []).map((id) => new mongoose.Types.ObjectId(String(id)));

  switch (appliesTo) {
    case "products":
      query._id = { $in: toIds(scope?.productIds) };
      break;
    case "categories":
      query.categoryId = { $in: toIds(scope?.categoryIds) };
      break;
    case "brands":
      query.brand = { $in: toIds(scope?.brandIds) };
      break;
    default:
      break;
  }

  const excludes = toIds(scope?.excludeProductIds);
  if (excludes.length > 0) {
    query._id = query._id
      ? { ...query._id, $nin: excludes }
      : { $nin: excludes };
  }

  return query;
}
