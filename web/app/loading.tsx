export default function Loading() {
  return (
    <div
      className="site-container py-20"
      role="status"
      aria-label="Loading publication"
    >
      <p className="eyebrow mb-6">Loading the latest edition</p>
      <div className="grid gap-12 md:grid-cols-2" aria-hidden="true">
        <div className="space-y-6">
          <div className="skeleton h-20 w-4/5" />
          <div className="skeleton h-16" />
          <div className="skeleton h-12 w-48" />
        </div>
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
