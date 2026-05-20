export default function BandCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-pl-elevated border border-pl-soft shadow-pl-photo animate-pulse">
      <div className="aspect-[3/2] w-full bg-pl-canvas" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-pl-canvas rounded-md w-3/4" />
        <div className="h-4 bg-pl-canvas rounded-md w-1/2" />
        <div className="h-3 bg-pl-canvas rounded-md w-1/3" />
      </div>
    </div>
  );
}
