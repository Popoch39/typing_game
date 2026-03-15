"use client";

import {
	BarChart3,
	ChevronLeft,
	Crown,
	Gamepad2,
	Menu,
	Settings,
	Swords,
	Target,
	Trophy,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { useRating } from "@/hooks/use-rating";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/providers/sidebar-provider";
import { Button } from "./ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";
import { UserAvatar } from "./user-avatar";

const navItems = [
	{
		label: "Play",
		icon: Gamepad2,
		href: "/",
		description: "Find a match",
	},
	{
		label: "Profile",
		icon: User,
		href: "/profile",
		description: "Your stats",
	},
	{
		label: "Ranked",
		icon: Crown,
		href: "/ranked",
		description: "Competitive",
	},
	{
		label: "Leaderboard",
		icon: Trophy,
		href: "/leaderboard",
		description: "Top players",
	},
	{
		label: "Match History",
		icon: Swords,
		href: "/history",
		description: "Past games",
	},
	{
		label: "Stats",
		icon: BarChart3,
		href: "/stats",
		description: "Analytics",
	},
];

const bottomItems = [
	{
		label: "Settings",
		icon: Settings,
		href: "/settings",
		description: "Preferences",
	},
];

// Rank colors for avatar borders
const rankColors: Record<string, string> = {
	Bronze: "ring-amber-700",
	Silver: "ring-slate-400",
	Gold: "ring-amber-500",
	Platinum: "ring-cyan-400",
	Diamond: "ring-primary",
	Master: "ring-purple-500",
	Grandmaster: "ring-red-500",
};

function NavLink({
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
			<Tooltip delayDuration={0}>
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

export function Sidebar() {
	const pathname = usePathname();
	const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } =
		useSidebar();
	const { data: session } = useSession();
	const { rankInfo } = useRating();

	const userName = session?.user?.name ?? "Player";
	const userImage = session?.user?.image;
	const currentRank = rankInfo?.tier ?? "Gold";
	const rankLabel = rankInfo?.tierLabel ?? "";
	const rankColor = rankColors[currentRank] || "ring-border";

	return (
		<>
			{/* Mobile Overlay */}
			{isMobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
					onClick={() => setIsMobileOpen(false)}
				/>
			)}

			{/* Mobile Menu Button */}
			<Button
				variant="ghost"
				size="icon"
				className="fixed top-4 left-4 z-50 lg:hidden"
				onClick={(e) => {
					e.stopPropagation();
					setIsMobileOpen(!isMobileOpen);
				}}
				aria-label={isMobileOpen ? "Close menu" : "Open menu"}
			>
				{isMobileOpen ? (
					<X className="h-5 w-5" />
				) : (
					<Menu className="h-5 w-5" />
				)}
			</Button>

			<aside
				id="sidebar"
				className={cn(
					"fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar",
					"transition-all duration-300 ease-in-out",
					isCollapsed ? "w-[72px]" : "w-64",
					// Mobile styles
					"max-lg:translate-x-[-100%] max-lg:w-64",
					isMobileOpen && "max-lg:translate-x-0",
				)}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Logo */}
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

				{/* Main Navigation */}
				<nav className="flex-1 space-y-1 p-3 overflow-y-auto">
					{navItems.map((item) => (
						<NavLink
							key={item.href}
							item={item}
							isActive={pathname === item.href}
							isCollapsed={isCollapsed}
						/>
					))}
				</nav>

				{/* Bottom Navigation */}
				<div className="border-t border-border p-3">
					{bottomItems.map((item) => (
						<NavLink
							key={item.href}
							item={item}
							isActive={pathname === item.href}
							isCollapsed={isCollapsed}
						/>
					))}
				</div>

				{/* User Section */}
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

				{/* Collapse Toggle - Desktop only */}
				<div className="hidden lg:block border-t border-border p-3">
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"w-full justify-center gap-2 text-muted-foreground hover:text-foreground",
							"transition-smooth",
						)}
						onClick={() => setIsCollapsed(!isCollapsed)}
						aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					>
						<ChevronLeft
							className={cn(
								"h-4 w-4 transition-transform duration-300",
								isCollapsed && "rotate-180",
							)}
						/>
						{!isCollapsed && <span className="text-xs">Collapse</span>}
					</Button>
				</div>
			</aside>
		</>
	);
}
