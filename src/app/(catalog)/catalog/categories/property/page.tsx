// app/admin/category-properties/page.tsx
import { connection } from "@/utils/connection";
import CategoryProperty from "@/models/CategoryProperty";
import AttributeSet from "@/models/AttributeSet";
import CategoryPropertyManager from "../_component/CategoryPropertyManager";

// Since this is a server component, we can directly query the DB
export default async function CategoryPropertiesPage() {
  await connection();

  // Fetch all category properties with populated 'sets'
  const properties = await CategoryProperty.find().populate("sets").lean();

  // Fetch all attribute sets for the multi-select dropdown
  const attributeSets = await AttributeSet.find()
    .select("_id title code")
    .lean();

  // Serialize to plain objects with string IDs
  const serializedProperties = properties.map((prop) => ({
    ...prop,
    _id: prop?._id?.toString(),
    createdAt: prop?.createdAt.toISOString(),
    updatedAt: prop?.updatedAt.toISOString(),
    sets: prop.sets.map((set: any) => ({
      _id: set._id.toString(),
      title: set.title,
      code: set.code,
    })),
  }));

  const serializedAttributeSets = attributeSets.map((set) => ({
    _id: set._id.toString(),
    title: set.title,
    code: set.code,
  }));

  return (
    <CategoryPropertyManager
      initialProperties={serializedProperties as any}
      attributeSets={serializedAttributeSets}
    />
  );
}
