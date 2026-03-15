"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinRoomInputProps {
	onJoinRoom: (code: string) => void;
}

export function JoinRoomInput({ onJoinRoom }: JoinRoomInputProps) {
	const [joinCode, setJoinCode] = useState("");

	const handleJoin = () => {
		const code = joinCode.trim().toUpperCase();
		if (code.length >= 4) {
			onJoinRoom(code);
			setJoinCode("");
		}
	};

	return (
		<div className="flex gap-2">
			<Input
				placeholder="Room code"
				value={joinCode}
				onChange={(e) =>
					setJoinCode((e.target as HTMLInputElement).value.toUpperCase())
				}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleJoin();
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
					handleJoin();
				}}
			>
				<LogIn className="h-4 w-4" />
			</Button>
		</div>
	);
}
