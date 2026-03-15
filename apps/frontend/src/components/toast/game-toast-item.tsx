"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastConfig } from "./toast-config";
import type { GameToast } from "./toast-store";

export function GameToastItem({
	toast,
	onDismiss,
}: {
	toast: GameToast;
	onDismiss: (id: string) => void;
}) {
	const config = toastConfig[toast.type];
	const Icon = config.icon;

	useEffect(() => {
		const timer = setTimeout(() => {
			onDismiss(toast.id);
		}, toast.duration || 5000);

		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onDismiss]);

	return (
		<div
			className={cn(
				"flex items-start gap-3 p-4 rounded-lg border-l-4",
				"bg-card elevation-2 animate-slide-up",
				"transition-all duration-300",
				config.borderClass,
			)}
		>
			<div
				className={cn(
					"shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
					config.bgClass,
				)}
			>
				<Icon className={cn("h-5 w-5", config.iconClass)} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-foreground">{toast.title}</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					{toast.description}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-6 w-6 shrink-0 -mt-1 -mr-1"
				onClick={() => onDismiss(toast.id)}
			>
				<X className="h-3.5 w-3.5" />
				<span className="sr-only">Dismiss</span>
			</Button>
		</div>
	);
}
