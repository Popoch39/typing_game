"use client";

import { useTypingStore } from "@/stores/use-typing-store";
import { useSaveScore } from "@/hooks/use-game-scores";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TypingResult() {
	const { wpm, rawWpm, accuracy, duration, mode, correctChars, incorrectChars, totalCharsTyped, reset } =
		useTypingStore();
	const saveScore = useSaveScore();

	const handleSave = () => {
		saveScore.mutate({
			wpm,
			rawWpm,
			accuracy,
			duration,
			mode,
			correctChars,
			incorrectChars,
			totalCharsTyped,
		});
	};

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center">Results</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="text-center">
					<div className="font-mono text-6xl font-bold text-primary">
						{wpm}
					</div>
					<div className="text-sm text-muted-foreground">wpm</div>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div>
						<div className="font-mono text-2xl font-semibold">{rawWpm}</div>
						<div className="text-xs text-muted-foreground">raw wpm</div>
					</div>
					<div>
						<div className="font-mono text-2xl font-semibold">{accuracy}%</div>
						<div className="text-xs text-muted-foreground">accuracy</div>
					</div>
					<div>
						<div className="font-mono text-2xl font-semibold">{duration}s</div>
						<div className="text-xs text-muted-foreground">duration</div>
					</div>
				</div>

				<div className="flex gap-3">
					<Button className="flex-1" variant="outline" onClick={reset}>
						Restart
					</Button>
					<Button
						className="flex-1"
						onClick={handleSave}
						disabled={saveScore.isPending || saveScore.isSuccess}
					>
						{saveScore.isSuccess
							? "Saved!"
							: saveScore.isPending
								? "Saving..."
								: "Save Score"}
					</Button>
				</div>

				<p className="text-center text-xs text-muted-foreground">
					Press <kbd className="rounded border px-1">Tab</kbd> +{" "}
					<kbd className="rounded border px-1">Enter</kbd> to restart
				</p>
			</CardContent>
		</Card>
	);
}
