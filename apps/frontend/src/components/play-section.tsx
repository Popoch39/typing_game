"use client";

import { Clock, Crown, Gamepad2, Users, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";

const gameModes = [
	{
		id: "quick",
		title: "Quick Match",
		description: "Jump into a casual 1v1 game with random opponents",
		icon: Zap,
		color: "text-primary",
		bgColor: "bg-primary/10",
		borderColor: "border-primary/40",
		buttonClass: "bg-primary hover:bg-primary/90",
		avgTime: "~2 min",
		features: ["No rank change", "Practice mode", "All skill levels"],
	},
	{
		id: "ranked",
		title: "Ranked Match",
		description: "Compete for rank and climb the leaderboard",
		icon: Crown,
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/40",
		buttonClass: "bg-amber-500 hover:bg-amber-500/90 text-background",
		avgTime: "~3 min",
		features: ["Rank points", "Seasonal rewards", "Skill-based matching"],
	},
	{
		id: "custom",
		title: "Custom Game",
		description: "Create a private room and invite friends",
		icon: Users,
		color: "text-orange-500",
		bgColor: "bg-orange-500/10",
		borderColor: "border-orange-500/40",
		buttonClass: "bg-orange-500 hover:bg-orange-500/90 text-background",
		avgTime: "Custom",
		features: ["Private rooms", "Custom settings", "Friend invites"],
	},
];

export function PlaySection() {
	const [selectedMode, setSelectedMode] = useState<string | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const presence = useMultiplayerStore((s) => s.presence);

	const handlePlay = (modeId: string) => {
		setSelectedMode(modeId);
		setIsSearching(true);
		setTimeout(() => {
			setIsSearching(false);
			setSelectedMode(null);
		}, 3000);
	};

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
					const isSelected = selectedMode === mode.id;
					const isSearchingThis = isSearching && isSelected;

					return (
						<Card
							key={mode.id}
							className={cn(
								"relative overflow-hidden cursor-pointer group",
								"transition-all duration-300 ease-out",
								"hover:elevation-2 hover:-translate-y-1",
								"active:scale-[0.98]",
								isSelected && mode.borderColor,
								isSearchingThis &&
									"ring-2 ring-offset-2 ring-offset-background ring-primary/50",
							)}
							style={{ animationDelay: `${index * 100}ms` }}
							onClick={() => !isSearching && setSelectedMode(mode.id)}
						>
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between">
									<div
										className={cn(
											"flex h-12 w-12 items-center justify-center rounded-xl",
											"transition-all duration-300 group-hover:scale-110",
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
								{/* Stats */}
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									<div className="flex items-center gap-1">
										<Clock className="h-3.5 w-3.5" />
										<span>{mode.avgTime}</span>
									</div>
								</div>

								{/* Features */}
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

								{/* Play Button */}
								<Button
									className={cn(
										"w-full font-semibold transition-all duration-200",
										"focus-ring",
										mode.buttonClass,
									)}
									disabled={isSearching}
									onClick={(e) => {
										e.stopPropagation();
										handlePlay(mode.id);
									}}
								>
									{isSearchingThis ? (
										<span className="flex items-center gap-2">
											<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
											Finding opponent...
										</span>
									) : (
										<span className="flex items-center gap-2">
											<Gamepad2 className="h-4 w-4" />
											{mode.id === "custom" ? "Create Room" : "Play Now"}
										</span>
									)}
								</Button>
							</CardContent>

							{/* Hover gradient effect */}
							<div
								className={cn(
									"absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
									"bg-gradient-to-br from-transparent via-transparent to-primary/5",
									"group-hover:opacity-100",
								)}
							/>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
