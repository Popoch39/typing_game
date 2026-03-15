"use client";

import { OnlinePlayers } from "@/components/online-players";
import { PlaySection } from "@/components/play-section";
import { QuickStats } from "@/components/quick-stats";
import { RecentMatches } from "@/components/recent-matches";
import { Sidebar } from "@/components/sidebar";
import { useSession } from "@/hooks/use-auth";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";

function MainContent() {
	const { isCollapsed } = useSidebar();
	const { data: session } = useSession();
	usePresence();

	const userName = session?.user?.name ?? "Player";

	return (
		<main
			className={cn(
				"transition-all duration-300 ease-in-out",
				"max-lg:pl-0 max-lg:pt-16",
				isCollapsed ? "lg:pl-[72px]" : "lg:pl-64",
			)}
		>
			<div className="p-4 md:p-6">
				{/* Header */}
				<div className="mb-6 md:mb-8 animate-slide-up">
					<h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance">
						Welcome back, <span className="text-primary">{userName}</span>
					</h1>
					<p className="text-muted-foreground mt-1">
						Ready for your next typing battle?
					</p>
				</div>

				{/* Main Grid */}
				<div className="grid gap-4 md:gap-6 lg:grid-cols-3">
					{/* Left Column - Play Options */}
					<div className="lg:col-span-2 space-y-4 md:space-y-6">
						<PlaySection />
						<RecentMatches />
					</div>

					{/* Right Column - Stats & Online */}
					<div className="space-y-4 md:space-y-6">
						<QuickStats />
						<OnlinePlayers />
					</div>
				</div>
			</div>
		</main>
	);
}

export default function Home() {
	return (
		<SidebarProvider>
			<div className="min-h-screen bg-background">
				<Sidebar />
				<MainContent />
			</div>
		</SidebarProvider>
	);
}
