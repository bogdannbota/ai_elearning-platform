export function SkeletonLoader({ count = 3, type = "card" }) {
  if (type === "card") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (type === "table-row") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{
              width: `${Math.random() * (100 - 50) + 50}%`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 shadow animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function GridSkeletons({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
