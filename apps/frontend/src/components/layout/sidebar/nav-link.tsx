"use client";

import Link from "next/link";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { navItems } from "./nav-config";

export function NavLink({
	item,
	isActive,
	isCollapsed,
}: {
	item: (typeof navItems)[0];
	isActive: boolean;
	isCollapsed: boolean;
}) {
	const content = (
		<Link
			href={item.href}
			className={cn(
				"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
				"transition-smooth focus-ring",
				"hover:bg-secondary/80 active:scale-[0.98]",
				isActive
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:text-foreground",
				isCollapsed && "justify-center px-2",
			)}
		>
			<item.icon
				className={cn(
					"h-5 w-5 shrink-0 transition-colors",
					isActive && "text-primary",
				)}
			/>
			{!isCollapsed && (
				<div className="flex flex-col min-w-0">
					<span className="truncate">{item.label}</span>
					{!isActive && (
						<span className="text-xs text-muted-foreground/70 truncate">
							{item.description}
						</span>
					)}
				</div>
			)}
		</Link>
	);

	if (isCollapsed) {
		return (
			<Tooltip>
				<TooltipTrigger>{content}</TooltipTrigger>
				<TooltipContent side="right" className="flex flex-col">
					<span className="font-medium">{item.label}</span>
					<span className="text-xs text-muted-foreground">
						{item.description}
					</span>
				</TooltipContent>
			</Tooltip>
		);
	}

	return content;
}
