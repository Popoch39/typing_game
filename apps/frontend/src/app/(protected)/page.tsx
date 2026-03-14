"use client";

import { useEffect } from "react";
import { useSession, useSignOut } from "@/hooks/use-auth";
import { useTypingStore } from "@/stores/use-typing-store";
import { TypingArea } from "@/components/typing/typing-area";
import { ComboDisplay } from "@/components/typing/combo-display";
import { TypingStats } from "@/components/typing/typing-stats";
import { TypingSettings } from "@/components/typing/typing-settings";
import { TypingResult } from "@/components/typing/typing-result";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	const { data: session } = useSession();
	const signOut = useSignOut();
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

	return (
		<div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
			{/* Header */}
			<header className="flex items-center justify-between">
				<h1 className="text-xl font-bold tracking-tight">
					Typing Game
				</h1>
				<div className="flex items-center gap-2">
					{session && (
						<span className="text-sm text-muted-foreground">
							{session.user.name}
						</span>
					)}
					<Link href="/multiplayer">
						<Button variant="outline" size="sm">
							1v1
						</Button>
					</Link>
					<ThemeToggle />
					<Button
						variant="ghost"
						size="sm"
						onClick={() => signOut.mutate()}
					>
						Sign out
					</Button>
				</div>
			</header>

			{/* Main content */}
			<main className="flex flex-1 flex-col items-center justify-center gap-8">
				{isComplete ? (
					<TypingResult />
				) : (
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
				)}
			</main>
		</div>
	);
}
