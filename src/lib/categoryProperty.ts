/**
 * Utility functions for handling categoryProperty field name conversion
 * Converts between snake_case (from API/categoryProperty) and camelCase (for database storage)
 */

/**
 * Converts snake_case to camelCase
 * @param str - String in snake_case format
 * @returns String in camelCase format
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Converts camelCase to snake_case
 * @param str - String in camelCase format
 * @returns String in snake_case format
 */
export function camelToSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * Transforms an object's keys from snake_case to camelCase recursively
 * @param obj - Object to transform
 * @returns New object with camelCase keys
 */
export function transformSnakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformSnakeToCamel(item));
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const transformed: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Dynamic category attribute payloads are not part of the canonical
      // product schema and are intentionally deferred for later cleanup.
      if (key === "categoryAttributes" || key === "categoryProperty") {
        transformed[key] = transformSnakeToCamel(obj[key]);
        continue;
      }

      const camelKey = snakeToCamel(key);
      transformed[camelKey] = transformSnakeToCamel(obj[key]);
    }
  }

  return transformed;
}

/**
 * Transforms an object's keys from camelCase to snake_case recursively
 * @param obj - Object to transform
 * @returns New object with snake_case keys
 */
export function transformCamelToSnake(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformCamelToSnake(item));
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const transformed: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === "categoryAttributes" || key === "categoryProperty") {
        transformed[key] = transformCamelToSnake(obj[key]);
        continue;
      }

      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformCamelToSnake(obj[key]);
    }
  }

  return transformed;
}

/**
 * Maps categoryProperty set structure to product form fields
 *
 * Example input structure:
 * {
 *   identification: {
 *     product_code: [{
 *       code_type: "EAN",
 *       code_value: "1234567890"
 *     }]
 *   },
 *   basic_information: {
 *     basic_infos: {
 *       title: "Product Name",
 *       brand: "Brand ID",
 *       short_description: "..."
 *     }
 *   }
 * }
 *
 * Output: Flat object with camelCase keys
 * {
 *   productCode: [{ codeType: "EAN", codeValue: "1234567890" }],
 *   basicInfos: { title: "...", brand: "...", shortDescription: "..." }
 * }
 */
export function flattenCategoryProperty(
  categoryProperty: any,
): Record<string, any> {
  if (!categoryProperty || typeof categoryProperty !== "object") {
    return {};
  }

  const flattened: Record<string, any> = {};

  // Iterate through each set (e.g., identification, basic_information)
  for (const setKey in categoryProperty) {
    if (!Object.prototype.hasOwnProperty.call(categoryProperty, setKey)) {
      continue;
    }

    const set = categoryProperty[setKey];
    if (!set || typeof set !== "object") {
      continue;
    }

    // Iterate through groups within each set
    for (const groupKey in set) {
      if (!Object.prototype.hasOwnProperty.call(set, groupKey)) {
        continue;
      }

      const groupData = set[groupKey];
      const camelGroupKey = snakeToCamel(groupKey);

      // Transform the group data to camelCase
      const transformedData = transformSnakeToCamel(groupData);
      flattened[camelGroupKey] = transformedData;
    }
  }

  return flattened;
}

/**
 * Reconstructs categoryProperty structure from flattened product data
 * Reverse of flattenCategoryProperty
 */
export function unflattenCategoryProperty(
  flatData: Record<string, any>,
  categoryPropertyTemplate?: any,
): Record<string, any> {
  if (!flatData || typeof flatData !== "object") {
    return {};
  }

  // If we have a template, use its structure
  if (
    categoryPropertyTemplate &&
    typeof categoryPropertyTemplate === "object"
  ) {
    const reconstructed: Record<string, any> = {};

    for (const setKey in categoryPropertyTemplate) {
      if (
        !Object.prototype.hasOwnProperty.call(categoryPropertyTemplate, setKey)
      ) {
        continue;
      }

      reconstructed[setKey] = {};
      const setTemplate = categoryPropertyTemplate[setKey];

      for (const groupKey in setTemplate) {
        if (!Object.prototype.hasOwnProperty.call(setTemplate, groupKey)) {
          continue;
        }

        const camelGroupKey = snakeToCamel(groupKey);
        if (flatData[camelGroupKey] !== undefined) {
          reconstructed[setKey][groupKey] = transformCamelToSnake(
            flatData[camelGroupKey],
          );
        }
      }
    }

    return reconstructed;
  }

  // Without template, try to reconstruct based on common patterns
  const reconstructed: Record<string, any> = {};

  for (const key in flatData) {
    if (!Object.prototype.hasOwnProperty.call(flatData, key)) {
      continue;
    }

    // Try to guess the set and group structure
    // This is a best-effort approach; with a template is more reliable
    const snakeKey = camelToSnake(key);

    // Default to a generic structure
    if (!reconstructed["other"]) {
      reconstructed["other"] = {};
    }

    reconstructed["other"][snakeKey] = transformCamelToSnake(flatData[key]);
  }

  return reconstructed;
}

/**
 * Merges categoryProperty data with existing product data
 * Handles the conversion from categoryProperty structure to flat product fields
 */
export function mergeCategoryPropertyToProduct(
  productData: Record<string, any>,
  categoryProperty: Record<string, any>,
): Record<string, any> {
  const flattened = flattenCategoryProperty(categoryProperty);
  return { ...productData, ...flattened };
}

/**
 * Maps field names from categoryProperty attribute codes to their display names
 * Used for UI/validation error messages
 */
export function getFieldLabel(code: string): string {
  // Convert from snake_case to a human-readable format
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
