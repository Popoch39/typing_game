import { Skeleton } from "@/components/ui/skeleton";

export function MatchSkeleton() {
	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<Skeleton className="h-9 w-9 rounded-full shrink-0" />
				<div className="space-y-1.5">
					<Skeleton className="h-3.5 w-14" />
					<Skeleton className="h-3 w-10" />
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0">
				<Skeleton className="h-6 w-7 rounded" />
				<Skeleton className="h-3 w-3" />
				<Skeleton className="h-6 w-7 rounded" />
			</div>
			<div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
				<div className="space-y-1.5 flex flex-col items-end">
					<Skeleton className="h-3.5 w-14" />
					<Skeleton className="h-3 w-10" />
				</div>
				<Skeleton className="h-9 w-9 rounded-full shrink-0" />
			</div>
		</div>
	);
}
