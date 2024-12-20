import { ObjectId } from "mongodb";

type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable };

/**
 * Recursively converts non-serializable fields like ObjectId and Buffer to plain values.
 * @param data - The input data which could be an object, array, or a primitive value.
 * @returns A plain object or array with non-serializable fields converted to strings.
 */
export function convertToSerializable(data: any): Serializable {
  if (Array.isArray(data)) {
    return data.map(convertToSerializable);
  } else if (data && typeof data === "object") {
    const serializedData: { [key: string]: Serializable } = {};
    for (const key in data) {
      if (
        data[key]?.toString &&
        (data[key] instanceof ObjectId || data[key] instanceof Buffer)
      ) {
        serializedData[key] = data[key].toString(); // Convert ObjectId or Buffer to string
      } else {
        serializedData[key] = convertToSerializable(data[key]); // Recurse for nested objects
      }
    }
    return serializedData;
  }
  return data;
}
