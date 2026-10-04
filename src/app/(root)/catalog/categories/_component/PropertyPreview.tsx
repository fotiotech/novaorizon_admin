import {
  Mapping,
  AttributeSetOption,
  GroupOption,
  AttributeOption,
} from "./PropertyForm";

interface PreviewProps {
  code: string;
  name: string;
  description: string;
  mappings: Mapping[];
  allSets: AttributeSetOption[];
  allGroups: GroupOption[];
  allAttributes: AttributeOption[];
}

export default function PropertyPreview({
  code,
  name,
  description,
  mappings,
  allSets,
  allGroups,
  allAttributes,
}: PreviewProps) {
  // Resolve set title
  const getSetTitle = (setId: string) => {
    const set = allSets.find((s) => s._id === setId);
    return set ? `${set.title} (${set.code})` : setId;
  };

  const getGroupName = (groupId: string) => {
    const group = allGroups.find((g) => g._id === groupId);
    return group ? `${group.name} (${group.code})` : groupId;
  };

  // Show attribute code and name together
  const getAttributeLabel = (attrId: string) => {
    const attr = allAttributes.find((a) => a._id === attrId);
    return attr ? `code: ${attr.code} - name: ${attr.name}` : attrId;
  };

  const hasContent = code.trim() || name.trim() || mappings.length > 0;

  if (!hasContent) {
    return (
      <div className="text-gray-500 text-sm italic">
        Fill in the form to see a preview.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
      <h4 className="font-semibold text-lg">Property Preview</h4>

      {/* Basic info */}
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Code:</span>{" "}
          <span className="text-blue-600 dark:text-blue-400">
            {code || "—"}
          </span>
        </div>
        <div>
          <span className="font-medium">Name:</span> {name || "—"}
        </div>
        {description && (
          <div>
            <span className="font-medium">Description:</span> {description}
          </div>
        )}
      </div>

      {/* Mappings */}
      {mappings.length > 0 && (
        <div className="mt-2">
          <h5 className="font-medium text-sm">Set Mappings</h5>
          <div className="ml-2 space-y-2 mt-1">
            {mappings.map((mapping, idx) => {
              if (!mapping.set && mapping.groups.length === 0) return null;
              const setTitle = mapping.set
                ? getSetTitle(mapping.set)
                : "(No set selected)";
              return (
                <div key={idx} className="border-l-2 border-blue-300 pl-3">
                  <div className="font-medium text-sm">
                    Set {idx + 1}: {setTitle}
                  </div>
                  {mapping.groups.length > 0 && (
                    <div className="ml-3 space-y-1">
                      {mapping.groups.map((group, gIdx) => {
                        const groupName = getGroupName(group.group);
                        return (
                          <div key={gIdx} className="text-sm">
                            <span className="font-medium">{groupName}</span>
                            {group.attributes.length > 0 && (
                              <ul className="ml-4 list-disc list-inside text-xs text-gray-600 dark:text-gray-300">
                                {group.attributes.map((attr, aIdx) => {
                                  const attrLabel = getAttributeLabel(
                                    attr.attribute,
                                  );
                                  return (
                                    <li key={aIdx}>
                                      {attrLabel}
                                      {attr.isRequired && (
                                        <span className="text-red-500 ml-1">
                                          *
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
