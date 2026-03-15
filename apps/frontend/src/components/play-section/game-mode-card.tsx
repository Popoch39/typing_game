"use client";

import { Gamepad2, X } from "lucide-react";
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

interface GameModeCardProps {
	mode: {
		id: string;
		title: string;
		description: string;
		icon: React.ElementType;
		color: string;
		bgColor: string;
		borderColor: string;
		buttonClass: string;
		features: string[];
		playLabel: string;
	};
	isActive: boolean;
	isSearching: boolean;
	isWaiting: boolean;
	isBusy: boolean;
	onPlay: () => void;
	onCancel: () => void;
	index: number;
	children?: React.ReactNode;
}

export function GameModeCard({
	mode,
	isActive,
	isSearching,
	isWaiting: _isWaiting,
	isBusy,
	onPlay,
	onCancel,
	index,
	children,
}: GameModeCardProps) {
	return (
		<Card
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

				{/* Searching state */}
				{isSearching && isActive && (
					<div className="flex justify-center py-2">
						<span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)}

				{/* Custom content (room code display, join input, etc.) */}
				{children}

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
							onPlay();
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
}
