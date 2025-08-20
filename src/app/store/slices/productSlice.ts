import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ProductState {
  byId: Record<string, any>;
  allIds: string[];
}

const initialState: ProductState = {
  byId: {},
  allIds: [],
};

// helpers (unchanged)
const isObject = (v: any) => v && typeof v === "object" && !Array.isArray(v);
const isNumeric = (s: string) => /^\d+$/.test(s);

// parse key like "items[0]" -> { prop: "items", idx: 0 }
// parse "0" -> { prop: null, idx: 0 } (index-only segment)
// parse "name" -> { prop: "name", idx: null }
function parseSegment(seg: string) {
  const bracket = seg.match(/^([^\[]+)\[(\d+)\]$/);
  if (bracket) return { prop: bracket[1], idx: Number(bracket[2]) };
  if (isNumeric(seg)) return { prop: null, idx: Number(seg) };
  return { prop: seg, idx: null };
}

// deep merge source into target (mutates target). Arrays are replaced by source arrays.
function deepMerge(target: any, source: any) {
  if (!isObject(source)) return source;
  if (!isObject(target)) return source;

  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (isObject(sv) && isObject(tv)) {
      deepMerge(tv, sv);
    } else {
      // arrays or primitives or object vs non-object: replace
      target[k] = sv;
    }
  }
  return target;
}

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setProducts: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    // reducer
    addProduct: (state, action: PayloadAction<any | null>) => {
      const { _id, path, value } = action.payload ?? {};
      if (!_id) {
        console.error("Missing _id in addProduct");
        return;
      }

      // ensure product exists
      if (!state.byId[_id]) {
        state.byId[_id] = {};
        state.allIds.push(_id);
      }

      // if no path provided, merge/replace the whole product object
      if (!path || path === "") {
        if (isObject(value) && isObject(state.byId[_id])) {
          deepMerge(state.byId[_id], value);
        } else {
          state.byId[_id] = value;
        }
        return;
      }

      // walk the path
      const segments = path.split(".");
      // cursor is current node we're mutating
      let cursor: any = state.byId[_id];

      // parent stack to be able to assign new nodes back to parent if we replace cursor
      // each entry: { node: parentObjectOrArray, key: string | number }
      const parentStack: Array<{ node: any; key: string | number | null }> = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const nextSeg = segments[i + 1];
        const isLast = i === segments.length - 1;

        const { prop, idx } = parseSegment(seg);

        // Helper to detect if next segment implies an array
        const nextIsIndex = nextSeg
          ? isNumeric(nextSeg) || /\[\d+\]$/.test(nextSeg)
          : false;

        if (idx !== null) {
          // Case A: segment is "prop[idx]" OR "idx" (index-only)
          if (prop) {
            // ensure cursor[prop] is an array
            if (!Array.isArray(cursor[prop])) {
              // create and assign array into parent right away
              cursor[prop] = [];
            }
            const arr = cursor[prop];

            if (isLast) {
              const existing = arr[idx];
              if (isObject(existing) && isObject(value)) {
                deepMerge(existing, value);
                arr[idx] = existing;
              } else {
                arr[idx] = value;
              }
            } else {
              // ensure arr[idx] exists and is object/array depending on nextSeg
              if (arr[idx] == null || typeof arr[idx] !== "object") {
                arr[idx] = nextIsIndex ? [] : {};
              }
              // push parent (array and index) then descend
              parentStack.push({ node: arr, key: idx });
              cursor = arr[idx];
            }
          } else {
            // index-only. cursor itself must be an array; if not, replace it in parent.
            if (!Array.isArray(cursor)) {
              // need to replace cursor in parent
              if (parentStack.length === 0) {
                // root-level replacement
                state.byId[_id] = [];
                cursor = state.byId[_id];
              } else {
                const last = parentStack[parentStack.length - 1];
                // last.key may be a string prop or a numeric index; assign accordingly
                if (typeof last.key === "number") {
                  last.node[last.key] = [];
                  cursor = last.node[last.key];
                } else {
                  last.node[last.key as string] = [];
                  cursor = last.node[last.key as string];
                }
              }
            }

            const arr = cursor;
            if (isLast) {
              const existing = arr[idx];
              if (isObject(existing) && isObject(value)) {
                deepMerge(existing, value);
                arr[idx] = existing;
              } else {
                arr[idx] = value;
              }
            } else {
              if (arr[idx] == null || typeof arr[idx] !== "object") {
                arr[idx] = nextIsIndex ? [] : {};
              }
              parentStack.push({ node: arr, key: idx });
              cursor = arr[idx];
            }
          }
        } else {
          // Case B: property segment ("name" / "details")
          const key = prop as string;
          if (isLast) {
            if (isObject(cursor[key]) && isObject(value)) {
              deepMerge(cursor[key], value);
            } else {
              cursor[key] = value;
            }
          } else {
            // ensure cursor[key] exists and has right type (object or array)
            if (cursor[key] == null || typeof cursor[key] !== "object") {
              cursor[key] = nextIsIndex ? [] : {};
            }
            // push parent and descend
            parentStack.push({ node: cursor, key });
            cursor = cursor[key];
          }
        }
      }
    },

    // (optional) initialize or reset a product
    resetProduct: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.byId[id]) {
        state.byId[id] = {};
        state.allIds.push(id);
      }
    },

    clearProduct: (state) => {
      // Reset to initial state
      state.byId = {};
      state.allIds = [];
    },
  },
});

export const { setProducts, addProduct, resetProduct, clearProduct } =
  productSlice.actions;
export default productSlice.reducer;
