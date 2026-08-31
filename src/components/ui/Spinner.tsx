export function Spinner({
  className = "h-6 w-6",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-t-transparent ${light ? "border-white" : "border-foreground"} ${className}`}
      aria-hidden
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
    </div>
  );
}
