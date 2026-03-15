"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoomCodeDisplayProps {
	roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
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
						handleCopy();
					}}
				>
					<Copy className="h-3.5 w-3.5" />
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">
				{copied ? "Copied!" : "Share this code with your opponent"}
			</p>
		</div>
	);
}
