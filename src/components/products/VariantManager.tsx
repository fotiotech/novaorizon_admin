import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  updateAttributes,
  updateVariants,
} from "@/app/store/slices/productSlice";
import { RootState } from "@/app/store/store";
import { useMemo, useEffect } from "react";
import MultiValueInput from "../MultipleValuesSelect";

// utility: cartesian product
const cartesian = <T,>(arrays: T[][]): T[][] =>
  arrays.reduce((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [
    [],
  ] as T[][]);

interface VariationManagerProps {
  themes: string[];
  productId: string;
}

const VariationManager: React.FC<VariationManagerProps> = ({
  themes,
  productId,
}) => {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(
    (state: RootState) => state.product.byId[productId]?.variants || []
  );
  const attributes = useAppSelector(
    (state: RootState) => state.product.byId[productId]?.attributes || {}
  );

  // 1) Normalize themes: split any "A-B" into ["A","B"]
  const normalizedThemes = useMemo(() => {
    return themes.flatMap((t) =>
      t
        .split("-")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
  }, [themes.join("|")]);

  // 2) Compute all combinations of normalized theme values
  const combinations = useMemo(() => {
    const allValues = normalizedThemes.map((theme) => {
      const valsSet = new Set<string>();
      Object.values(attributes).forEach((groupAttrs) => {
        const raw = (groupAttrs as any)[theme];
        if (raw != null) {
          if (Array.isArray(raw)) raw.forEach((v) => valsSet.add(String(v)));
          else valsSet.add(String(raw));
        }
      });
      return Array.from(valsSet);
    });
    return cartesian(allValues);
  }, [normalizedThemes.join(","), JSON.stringify(attributes)]);

  // 3) Sync variants in store
  useEffect(() => {
    const newVariants = combinations.map((values) => {
      const key = values.join("_");
      const existing = variants.find((v: any) => v.key === key);
      return (
        existing || {
          key,
          attributes: normalizedThemes.reduce(
            (obj, th, i) => ({ ...obj, [th]: values[i] }),
            {} as Record<string, string>
          ),
          sku: "",
          price: 0,
          stock: 0,
        }
      );
    });
    dispatch(updateVariants({ productId, variants: newVariants }));
  }, [combinations, dispatch, productId]);

  // 4) Inline edits
  const handleVariantChange = (
    index: number,
    field: "sku" | "price" | "stock",
    value: any
  ) => {
    const updated = variants.map((v: any, i: any) =>
      i === index ? { ...v, [field]: value } : v
    );
    dispatch(updateVariants({ productId, variants: updated }));
  };

  // 5) Check if each normalized theme has values entered
  const themeValuesArrays = normalizedThemes.map(
    (theme) => (attributes["Variants & Options"]?.[theme] as string[]) || []
  );
  const needThemeValues = themeValuesArrays.some(
    (vals) => !vals || vals.length === 0
  );

  if (needThemeValues) {
    return (
      <div className="mt-6 space-y-4">
        <h4 className="text-md font-medium mb-2">
          Enter Values for Each Theme
        </h4>
        {normalizedThemes.map((theme) => {
          const currentId =
            (attributes["Variants & Options"]?._id as string)
            const currentVals =
            (attributes["Variants & Options"]?.[theme] as string[]) || []
          const parent_id =
            (attributes["Variants & Options"]?.parent_id as string);
          return (
            <div key={theme} className="mb-4">
              <label className="block mb-1">{theme} Values</label>
              <MultiValueInput
                values={currentVals}
                onChange={(newVals: string[]) =>
                  dispatch(
                    updateAttributes({
                      productId,
                      groupId: currentId,
                      groupName: "Variants & Options",
                      parent_id,
                      attrName: theme,
                      selectedValues: newVals,
                    })
                  )
                }
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 6) Nothing to show if no themes at all
  if (!normalizedThemes.length) return null;

  // 7) Render variant table
  return (
    <div className="mt-6">
      <h4 className="text-md font-medium mb-2">Variant Combinations</h4>
      <table className="w-full table-auto border">
        <thead>
          <tr>
            {normalizedThemes.map((th) => (
              <th key={th} className="border px-2">
                {th}
              </th>
            ))}
            <th className="border px-2">SKU</th>
            <th className="border px-2">Price</th>
            <th className="border px-2">Stock</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v: any, idx: any) => (
            <tr key={v.key}>
              {normalizedThemes.map((th) => (
                <td key={th} className="border px-2">
                  {v.attributes[th]}
                </td>
              ))}
              <td className="border px-2">
                <input
                  title="SKU"
                  type="text"
                  className="w-full"
                  value={v.sku}
                  onChange={(e) =>
                    handleVariantChange(idx, "sku", e.target.value)
                  }
                />
              </td>
              <td className="border px-2">
                <input
                  title="Price"
                  type="number"
                  className="w-full"
                  value={v.price}
                  onChange={(e) =>
                    handleVariantChange(idx, "price", Number(e.target.value))
                  }
                />
              </td>
              <td className="border px-2">
                <input
                  title="Stock"
                  type="number"
                  className="w-full"
                  value={v.stock}
                  onChange={(e) =>
                    handleVariantChange(idx, "stock", Number(e.target.value))
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VariationManager;