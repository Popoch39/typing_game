"use client";

import { useEffect } from "react";
import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingArea } from "@/components/typing/typing-area";
import { TypingResult } from "@/components/typing/typing-result";
import { TypingSettings } from "@/components/typing/typing-settings";
import { TypingStats } from "@/components/typing/typing-stats";
import { useTypingStore } from "@/stores/use-typing-store";

export default function Home() {
	const { init, handleKeyPress, isComplete, isRunning } = useTypingStore();

	useEffect(() => {
		init();
		return () => {
			useTypingStore.getState().engine?.destroy();
		};
	}, [init]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => handleKeyPress(e);
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [handleKeyPress]);

	if (isComplete) {
		return <TypingResult />;
	}

	return (
		<div className="w-full space-y-6">
			<div className="flex items-center justify-between">
				<TypingStats />
				<TypingSettings />
			</div>
			<div className="relative">
				<ComboDisplay />
				<TypingArea />
			</div>
			{!isRunning && (
				<p className="text-center text-sm text-muted-foreground">
					Start typing to begin...
				</p>
			)}
		</div>
	);
}
