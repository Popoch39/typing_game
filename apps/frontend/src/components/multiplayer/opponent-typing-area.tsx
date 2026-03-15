"use client";

import { useEffect, useRef } from "react";

interface OpponentTypingAreaProps {
	words: string[];
	wordIndex: number;
	charIndex: number;
}

export function OpponentTypingArea({
	words,
	wordIndex,
	charIndex,
}: OpponentTypingAreaProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const activeWord = container.querySelector<HTMLElement>(
			`[data-ow="${wordIndex}"]`,
		);
		if (!activeWord) return;

		const containerRect = container.getBoundingClientRect();
		const wordRect = activeWord.getBoundingClientRect();
		const offsetTop = wordRect.top - containerRect.top + container.scrollTop;
		const targetScroll = offsetTop - containerRect.height / 3;

		container.scrollTo?.({
			top: Math.max(0, targetScroll),
			behavior: "smooth",
		});
	}, [wordIndex]);

	if (words.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="relative h-[3em] overflow-hidden rounded-lg font-sans text-2xl font-bold leading-[1.5em] select-none"
		>
			<div className="relative flex flex-wrap gap-x-[0.5em]">
				{words.map((word, wIdx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: word list is static during a game
					<span key={`${wIdx}-${word}`} data-ow={wIdx} className="relative">
						{word.split("").map((char, cIdx) => {
							let state: string;
							if (wIdx < wordIndex) {
								state = "opponent-typed";
							} else if (wIdx === wordIndex) {
								state = cIdx < charIndex ? "opponent-typed" : "pending";
							} else {
								state = "pending";
							}

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: chars in a word are static
								<span key={cIdx} data-state={state}>
									{cIdx === charIndex && wIdx === wordIndex && (
										<span className="pointer-events-none absolute z-10 h-[1.2em] w-[2px] animate-cursor-blink bg-primary/50" />
									)}
									{char}
								</span>
							);
						})}
					</span>
				))}
			</div>
		</div>
	);
}
