"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 60, 120];

export function LobbyScreen({
	onJoinQueue,
	onJoinRankedQueue,
	onCreateRoom,
	onJoinRoom,
}: {
	onJoinQueue: (duration: number) => void;
	onJoinRankedQueue: (duration: number) => void;
	onCreateRoom: (duration: number) => void;
	onJoinRoom: (code: string) => void;
}) {
	const [duration, setDuration] = useState(30);
	const [roomCode, setRoomCode] = useState("");
	const [tab, setTab] = useState<"casual" | "ranked" | "private">("casual");

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center">1v1 Multiplayer</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Duration selection */}
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Duration</p>
					<div className="flex items-center gap-2">
						{DURATIONS.map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => setDuration(d)}
								className={cn(
									"rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
									d === duration
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{d}s
							</button>
						))}
					</div>
				</div>

				{/* Tab toggle */}
				<div className="flex rounded-lg bg-muted p-1">
					<button
						type="button"
						onClick={() => setTab("casual")}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							tab === "casual"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground",
						)}
					>
						Casual
					</button>
					<button
						type="button"
						onClick={() => setTab("ranked")}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							tab === "ranked"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground",
						)}
					>
						Ranked
					</button>
					<button
						type="button"
						onClick={() => setTab("private")}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							tab === "private"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground",
						)}
					>
						Private Room
					</button>
				</div>

				{tab === "casual" && (
					<Button className="w-full" onClick={() => onJoinQueue(duration)}>
						Find Match
					</Button>
				)}

				{tab === "ranked" && (
					<Button
						className="w-full"
						onClick={() => onJoinRankedQueue(duration)}
					>
						Find Ranked Match
					</Button>
				)}

				{tab === "private" && (
					<div className="space-y-3">
						<Button className="w-full" onClick={() => onCreateRoom(duration)}>
							Create Room
						</Button>
						<div className="flex gap-2">
							<Input
								placeholder="Room code"
								value={roomCode}
								onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
								maxLength={6}
								className="font-mono tracking-widest"
							/>
							<Button
								onClick={() => roomCode && onJoinRoom(roomCode)}
								disabled={roomCode.length < 6}
							>
								Join
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
