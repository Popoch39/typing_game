"use client";

import { useMultiplayerStore } from "@/hooks/use-multiplayer";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function WaitingScreen({
	onCancel,
}: {
	onCancel: () => void;
}) {
	const status = useMultiplayerStore((s) => s.status);
	const roomCode = useMultiplayerStore((s) => s.roomCode);

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center">
					{status === "queuing"
						? "Finding opponent..."
						: "Waiting for opponent..."}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-center">
				<div className="flex justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
				{roomCode && (
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">Room Code</p>
						<p className="font-mono text-2xl font-bold tracking-widest">
							{roomCode}
						</p>
						<p className="text-xs text-muted-foreground">
							Share this code with your opponent
						</p>
					</div>
				)}
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>
			</CardContent>
		</Card>
	);
}
