"use client";

import { Crown, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";
import { GameModeCard } from "./game-mode-card";
import { JoinRoomInput } from "./join-room-input";
import { RoomCodeDisplay } from "./room-code-display";

interface PlaySectionProps {
	onQuickPlay: () => void;
	onRankedPlay: () => void;
	onCreateRoom: () => void;
	onJoinRoom: (code: string) => void;
	onCancel: () => void;
}

export function PlaySection({
	onQuickPlay,
	onRankedPlay,
	onCreateRoom,
	onJoinRoom,
	onCancel,
}: PlaySectionProps) {
	const presence = useMultiplayerStore((s) => s.presence);
	const status = useMultiplayerStore((s) => s.status);
	const roomCode = useMultiplayerStore((s) => s.roomCode);
	const isRanked = useMultiplayerStore((s) => s.isRanked);

	const isSearching = status === "queuing" || status === "connecting";
	const isWaitingRoom = status === "in_room";
	const isBusy = isSearching || isWaitingRoom;

	// Determine which mode is active based on store state
	const activeMode = isBusy
		? isWaitingRoom
			? "custom"
			: isRanked
				? "ranked"
				: "quick"
		: null;

	const gameModes = [
		{
			id: "quick" as const,
			title: "Quick Match",
			description: "Jump into a casual 1v1 game with random opponents",
			icon: Zap,
			color: "text-primary",
			bgColor: "bg-primary/10",
			borderColor: "border-primary/40",
			buttonClass: "bg-primary hover:bg-primary/90",
			features: ["No rank change", "Practice mode", "All skill levels"],
			onPlay: onQuickPlay,
			playLabel: "Play Now",
		},
		{
			id: "ranked" as const,
			title: "Ranked Match",
			description: "Compete for rank and climb the leaderboard",
			icon: Crown,
			color: "text-amber-500",
			bgColor: "bg-amber-500/10",
			borderColor: "border-amber-500/40",
			buttonClass: "bg-amber-500 hover:bg-amber-500/90 text-background",
			features: ["Rank points", "Seasonal rewards", "Skill-based matching"],
			onPlay: onRankedPlay,
			playLabel: "Play Now",
		},
		{
			id: "custom" as const,
			title: "Custom Game",
			description: "Create a private room and invite friends",
			icon: Users,
			color: "text-orange-500",
			bgColor: "bg-orange-500/10",
			borderColor: "border-orange-500/40",
			buttonClass: "bg-orange-500 hover:bg-orange-500/90 text-background",
			features: ["Private rooms", "Custom settings", "Friend invites"],
			onPlay: onCreateRoom,
			playLabel: "Create Room",
		},
	];

	return (
		<div className="space-y-4 animate-slide-up">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h2 className="text-xl font-semibold text-foreground">Game Modes</h2>
					<p className="text-sm text-muted-foreground">
						Choose your battlefield
					</p>
				</div>
				<Badge variant="outline" className="gap-1.5 w-fit">
					<span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
					{presence.online + presence.queuing + presence.inGame} players online
				</Badge>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{gameModes.map((mode, index) => {
					const isActive = activeMode === mode.id;
					const isSearchingThis = isActive && isSearching;
					const isWaitingThis = isActive && isWaitingRoom;

					return (
						<GameModeCard
							key={mode.id}
							mode={mode}
							isActive={isActive}
							isSearching={isSearchingThis}
							isWaiting={isWaitingThis}
							isBusy={isBusy}
							onPlay={mode.onPlay}
							onCancel={onCancel}
							index={index}
						>
							{/* Room code display for custom waiting */}
							{isWaitingThis && roomCode && (
								<RoomCodeDisplay roomCode={roomCode} />
							)}

							{/* Join room input for custom card */}
							{mode.id === "custom" && !isBusy && (
								<JoinRoomInput onJoinRoom={onJoinRoom} />
							)}
						</GameModeCard>
					);
				})}
			</div>
		</div>
	);
}
