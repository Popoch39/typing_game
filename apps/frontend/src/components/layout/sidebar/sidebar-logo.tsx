"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
	return (
		<div
			className={cn(
				"flex h-16 items-center border-b border-border px-4",
				isCollapsed ? "justify-center" : "gap-3",
			)}
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
				<Target className="h-5 w-5 text-primary-foreground" />
			</div>
			{!isCollapsed && (
				<div className="min-w-0 animate-slide-up">
					<h1 className="text-lg font-bold text-foreground truncate">
						TypeDuel
					</h1>
					<p className="text-xs text-muted-foreground">1v1 Typing Arena</p>
				</div>
			)}
		</div>
	);
}
