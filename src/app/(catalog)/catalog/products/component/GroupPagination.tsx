import { useState, useMemo } from "react";

interface Attribute {
  _id: string;
  name: string;
  [key: string]: any;
}

interface PopulatedAttributeGroup {
  _id: string;
  name: string;
  group_order?: number;
  sort_order?: number;
  parent_id?: string | null;
  attributes: Attribute[];
  children: PopulatedAttributeGroup[];
}

export default function GroupPagination({
  groups,
}: {
  groups: PopulatedAttributeGroup[];
}) {
  const pageSize = 5;
  const [page, setPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.ceil(groups.length / pageSize);
  }, [groups.length]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }, [groups, page]);

  return (
    <div>
      <div>
        {paginatedGroups.map((group) => (
          <div key={group._id}>
            <h3>{group.name}</h3>
            {/* render attributes or children here */}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
