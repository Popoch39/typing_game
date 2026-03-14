"use client";

import { useRef } from "react";
import { useTypingDom } from "./hooks/use-typing-dom";
import { ScorePopup } from "./score-popup";

export function TypingArea() {
	const containerRef = useRef<HTMLDivElement>(null);
	const wordsRef = useRef<HTMLDivElement>(null);
	const caretRef = useRef<HTMLSpanElement>(null);

	const initialWords = useTypingDom({
		container: containerRef,
		words: wordsRef,
		caret: caretRef,
	});

	if (initialWords.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="relative h-[4.5em] overflow-hidden rounded-lg font-sans text-5xl font-bold leading-[1.5em] select-none focus:outline-none"
		>
			<ScorePopup />
			<div ref={wordsRef} className="relative flex flex-wrap gap-x-[0.5em]">
				<span
					ref={caretRef}
					className="pointer-events-none absolute left-0 top-0 z-10 h-[1.2em] w-[2px] animate-cursor-blink bg-primary opacity-0"
					style={{
						transition: "transform 150ms linear",
						willChange: "transform",
					}}
				/>

				{initialWords.map((word, wordIndex) => (
					<span key={`${wordIndex}-${word.word}`} className="relative">
						{word.chars.map((char, charIndex) => (
							<span
								key={charIndex}
								data-w={wordIndex}
								data-c={charIndex}
								data-state={char.state}
							>
								{char.char}
							</span>
						))}
					</span>
				))}
			</div>
		</div>
	);
}
