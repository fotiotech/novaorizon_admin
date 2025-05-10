import { findCategoryAttributesAndValues } from "@/app/actions/attributes";
import { setAttributes } from "@/app/store/slices/attributeSlice";
import { normalizeAttribute } from "@/app/store/slices/normalizedData";
import { AppDispatch } from "@/app/store/store";

// ------ Types for the raw API response ------
interface AttributeValue {
  _id: string;
  attribute_id: string;
  value: string;
  __v: number;
}

interface RawAttribute {
  id: string;
  name: string;
  values: AttributeValue[];
}

interface GroupedAttribute {
  groupName: string;
  attributes: RawAttribute[];
}

interface CategoryAttributesResponse {
  categoryId: string;
  categoryName: string;
  groupedAttributes: GroupedAttribute[];
}

// ------ Utility: recursively convert Maps to plain objects ------
const convertMapToObject = (data: any): any => {
  if (data instanceof Map) {
    return Object.fromEntries(data);
  } else if (Array.isArray(data)) {
    return data.map(convertMapToObject);
  } else if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, convertMapToObject(v)])
    );
  }
  return data;
};

export const fetchAttributes =
  (catId: string) => async (dispatch: AppDispatch) => {
    try {
      const response = (await findCategoryAttributesAndValues(
        catId
      )) as CategoryAttributesResponse[];

      console.log("Fetched attributes:", response);

      // 1) Ensure we actually got groups back
      const groups = response?.[0]?.groupedAttributes;
      if (!groups || groups.length === 0) {
        console.warn(`No attribute groups found for category ${catId}`);
        return;
      }

      // 2) Flatten into an array of plain { id, name, values, groupName }
      const flatAttrs = groups.flatMap((group) =>
        group.attributes.map((attr) => ({
          id: attr.id,
          name: attr.name,
          values: attr.values,
          groupName: group.groupName,
        }))
      );

      // 3) Sanitize any Map instances (if your backend ever returns them)
      const sanitized = flatAttrs.map((item) => convertMapToObject(item));

      // 4) Normalize into { entities.attributes: { [id]: ... }, result: [id] }
      const normalized = normalizeAttribute(sanitized);

      // 5) Guard against a bad schema
      if (
        !normalized.result ||
        normalized.result.some((_id: string) => _id === undefined)
      ) {
        console.error(
          "Normalization failed. Check the schema or data structure."
        );
        return;
      }

      // 6) Dispatch in the { byId, allIds } shape
      dispatch(
        setAttributes({
          attributes: normalized.entities.attributes || {},
          attributeIds: normalized.result,
        })
      );

      console.log("Attributes successfully normalized & dispatched.");
    } catch (err) {
      console.error("Error fetching attributes:", err);
      // you could dispatch a failure action here if desired
    }
  };
