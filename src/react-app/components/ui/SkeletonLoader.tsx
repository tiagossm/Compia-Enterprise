

interface SkeletonLoaderProps {
    className?: string;
    count?: number;
}

export default function SkeletonLoader({ className = "h-4 w-full", count = 1 }: SkeletonLoaderProps) {
    return (
        <div className="space-y-2 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`animate-pulse bg-slate-200 rounded ${className}`}
                />
            ))}
        </div>
    );
}
