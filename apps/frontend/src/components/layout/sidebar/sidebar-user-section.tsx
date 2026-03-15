"use client";

import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export function SidebarUserSection({
	userName,
	userImage,
	rankColor,
	rankLabel,
	isCollapsed,
}: {
	userName: string;
	userImage?: string | null;
	rankColor: string;
	rankLabel: string;
	isCollapsed: boolean;
}) {
	return (
		<div className="border-t border-border p-3">
			<div
				className={cn(
					"flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5",
					"transition-smooth hover:bg-secondary/70",
					isCollapsed && "justify-center px-2",
				)}
			>
				<div className="relative shrink-0">
					<UserAvatar
						name={userName}
						image={userImage}
						size="md"
						ringClassName={rankColor}
						className="ring-offset-sidebar"
					/>
					<div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-green-500" />
				</div>
				{!isCollapsed && (
					<div className="flex-1 min-w-0 animate-slide-up">
						<p className="text-sm font-medium text-foreground truncate">
							{userName}
						</p>
						<p className="text-xs text-muted-foreground">{rankLabel}</p>
					</div>
				)}
			</div>
		</div>
	);
}
