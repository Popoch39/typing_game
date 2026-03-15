"use client";

import { RecentMatches } from "@/components/dashboard/recent-matches/recent-matches";
import { OnlinePlayers } from "@/components/online-players";
import { PlaySection } from "@/components/play-section/play-section";
import { QuickStats } from "@/components/quick-stats";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayer } from "@/hooks/use-multiplayer";

const GAME_DURATION = 15;

export default function DashboardPage() {
	const { data: session } = useSession();
	const mp = useMultiplayer();

	const userName = session?.user?.name ?? "Player";

	const handleCancel = () => {
		mp.leaveQueue();
		mp.leaveRankedQueue();
	};

	return (
		<>
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
					<PlaySection
						onQuickPlay={() => mp.joinQueue(GAME_DURATION)}
						onRankedPlay={() => mp.joinRankedQueue(GAME_DURATION)}
						onCreateRoom={() => mp.createRoom(GAME_DURATION)}
						onJoinRoom={(code) => mp.joinRoom(code)}
						onCancel={handleCancel}
					/>
					<RecentMatches />
				</div>

				{/* Right Column - Stats & Online */}
				<div className="space-y-4 md:space-y-6">
					<QuickStats />
					<OnlinePlayers />
				</div>
			</div>
		</>
	);
}
