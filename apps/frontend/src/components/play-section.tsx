"use client";

import {
	Clock,
	Copy,
	Crown,
	Gamepad2,
	LogIn,
	Users,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

const GAME_DURATION = 15;

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
	const [joinCode, setJoinCode] = useState("");
	const [copied, setCopied] = useState(false);
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

	const handleCopyCode = () => {
		if (!roomCode) return;
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleJoinRoom = () => {
		const code = joinCode.trim().toUpperCase();
		if (code.length >= 4) {
			onJoinRoom(code);
			setJoinCode("");
		}
	};

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
						<Card
							key={mode.id}
							className={cn(
								"relative overflow-hidden group",
								"transition-all duration-300 ease-out",
								!isBusy &&
									"cursor-pointer hover:elevation-2 hover:-translate-y-1 active:scale-[0.98]",
								isActive && mode.borderColor,
								isActive &&
									"ring-2 ring-offset-2 ring-offset-background ring-primary/50",
							)}
							style={{ animationDelay: `${index * 100}ms` }}
						>
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between">
									<div
										className={cn(
											"flex h-12 w-12 items-center justify-center rounded-xl",
											"transition-all duration-300",
											!isBusy && "group-hover:scale-110",
											mode.bgColor,
										)}
									>
										<mode.icon className={cn("h-6 w-6", mode.color)} />
									</div>
									{mode.id === "ranked" && (
										<Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
											Season 4
										</Badge>
									)}
								</div>
								<CardTitle className="text-lg mt-3">{mode.title}</CardTitle>
								<CardDescription className="text-sm line-clamp-2">
									{mode.description}
								</CardDescription>
							</CardHeader>

							<CardContent className="space-y-4">
								{/* Features */}
								{!isActive && (
									<div className="flex flex-wrap gap-1.5">
										{mode.features.map((feature) => (
											<Badge
												key={feature}
												variant="secondary"
												className="text-xs font-normal"
											>
												{feature}
											</Badge>
										))}
									</div>
								)}

								{/* Room code display for custom waiting */}
								{isWaitingThis && roomCode && (
									<div className="space-y-2 text-center">
										<p className="text-xs text-muted-foreground">Room Code</p>
										<div className="flex items-center justify-center gap-2">
											<span className="font-mono text-2xl font-bold tracking-widest text-foreground">
												{roomCode}
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												onClick={(e) => {
													e.stopPropagation();
													handleCopyCode();
												}}
											>
												<Copy className="h-3.5 w-3.5" />
											</Button>
										</div>
										<p className="text-xs text-muted-foreground">
											{copied
												? "Copied!"
												: "Share this code with your opponent"}
										</p>
									</div>
								)}

								{/* Searching state */}
								{isSearchingThis && (
									<div className="flex justify-center py-2">
										<span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									</div>
								)}

								{/* Join room input for custom card */}
								{mode.id === "custom" && !isBusy && (
									<div className="flex gap-2">
										<Input
											placeholder="Room code"
											value={joinCode}
											onChange={(e) =>
												setJoinCode(
													(e.target as HTMLInputElement).value.toUpperCase(),
												)
											}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleJoinRoom();
											}}
											className="font-mono text-center tracking-widest uppercase"
											maxLength={6}
										/>
										<Button
											variant="outline"
											size="sm"
											className="shrink-0"
											disabled={joinCode.trim().length < 4}
											onClick={(e) => {
												e.stopPropagation();
												handleJoinRoom();
											}}
										>
											<LogIn className="h-4 w-4" />
										</Button>
									</div>
								)}

								{/* Action button */}
								{isActive ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={(e) => {
											e.stopPropagation();
											onCancel();
										}}
									>
										<X className="h-4 w-4 mr-2" />
										Cancel
									</Button>
								) : (
									<Button
										className={cn(
											"w-full font-semibold transition-all duration-200",
											"focus-ring",
											mode.buttonClass,
										)}
										disabled={isBusy}
										onClick={(e) => {
											e.stopPropagation();
											mode.onPlay();
										}}
									>
										<span className="flex items-center gap-2">
											<Gamepad2 className="h-4 w-4" />
											{mode.playLabel}
										</span>
									</Button>
								)}
							</CardContent>

							{/* Hover gradient effect */}
							{!isBusy && (
								<div
									className={cn(
										"absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
										"bg-gradient-to-br from-transparent via-transparent to-primary/5",
										"group-hover:opacity-100",
									)}
								/>
							)}
						</Card>
					);
				})}
			</div>
		</div>
	);
}
