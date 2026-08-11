// Skeleton loader component
export const SkeletonLoader = () => (
  <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-pulse">
    <div className="space-y-8 bg-background border border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md">
      <div className="h-8 sm:h-10 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-4"></div>

      {[1, 2, 3, 4].map((section) => (
        <div key={section} className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 sm:w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-center gap-4 p-4 border border-border rounded-xl"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);