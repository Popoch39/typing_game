"use client";

import { ChevronLeft, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { useRating } from "@/hooks/use-rating";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/providers/sidebar-provider";
import { bottomItems, navItems, rankColors } from "./nav-config";
import { NavLink } from "./nav-link";
import { SidebarLogo } from "./sidebar-logo";
import { SidebarUserSection } from "./sidebar-user-section";

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
				<SidebarLogo isCollapsed={isCollapsed} />

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
				<SidebarUserSection
					userName={userName}
					userImage={userImage}
					rankColor={rankColor}
					rankLabel={rankLabel}
					isCollapsed={isCollapsed}
				/>

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
