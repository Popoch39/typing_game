"use client";

import { useEffect, useRef } from "react";
import { useTypingStore } from "@/stores/use-typing-store";
import { cn } from "@/lib/utils";

export function TypingArea() {
	const words = useTypingStore((s) => s.words);
	useTypingStore((s) => s.wordsVersion);
	const currentWordIndex = useTypingStore((s) => s.currentWordIndex);
	const currentCharIndex = useTypingStore((s) => s.currentCharIndex);
	const isRunning = useTypingStore((s) => s.isRunning);
	const isComplete = useTypingStore((s) => s.isComplete);

	const containerRef = useRef<HTMLDivElement>(null);
	const wordsRef = useRef<HTMLDivElement>(null);
	const caretRef = useRef<HTMLSpanElement>(null);
	const lineHeightRef = useRef<number>(0);

	// Move caret via direct DOM mutation — no re-render
	useEffect(() => {
		const caret = caretRef.current;
		const wordsEl = wordsRef.current;
		const scrollEl = containerRef.current;
		if (!caret || !wordsEl || isComplete) {
			if (caret) caret.style.opacity = "0";
			return;
		}

		function getOffsetRelativeTo(
			el: HTMLElement,
			ancestor: HTMLElement,
		): { left: number; top: number } {
			let left = 0;
			let top = 0;
			let current: HTMLElement | null = el;
			while (current && current !== ancestor) {
				left += current.offsetLeft;
				top += current.offsetTop;
				current = current.offsetParent as HTMLElement | null;
			}
			return { left, top };
		}

		let left = 0;
		let top = 0;

		const currentEl = wordsEl.querySelector<HTMLSpanElement>(
			`[data-w="${currentWordIndex}"][data-c="${currentCharIndex}"]`,
		);
		if (currentEl) {
			({ left, top } = getOffsetRelativeTo(currentEl, wordsEl));
		} else {
			const prevEl = wordsEl.querySelector<HTMLSpanElement>(
				`[data-w="${currentWordIndex}"][data-c="${currentCharIndex - 1}"]`,
			);
			if (prevEl) {
				const pos = getOffsetRelativeTo(prevEl, wordsEl);
				left = pos.left + prevEl.offsetWidth;
				top = pos.top;
			}
		}

		caret.style.transform = `translate(${left}px, ${top}px)`;
		caret.style.opacity = "1";

		// Scroll: keep caret on the first visible line
		if (scrollEl) {
			if (!lineHeightRef.current) {
				lineHeightRef.current =
					parseFloat(getComputedStyle(scrollEl).lineHeight) || 40;
			}
			const lineHeight = lineHeightRef.current;
			const targetScroll = Math.max(0, top - lineHeight);

			if (scrollEl.scrollTop !== targetScroll) {
				scrollEl.scrollTop = targetScroll;
			}
		}
	}, [currentWordIndex, currentCharIndex, isComplete, words]);

	// Toggle blink class based on isRunning
	useEffect(() => {
		const caret = caretRef.current;
		if (!caret) return;
		if (isRunning) {
			caret.classList.remove("animate-cursor-blink");
		} else {
			caret.classList.add("animate-cursor-blink");
		}
	}, [isRunning]);

	if (words.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="relative h-[4.5em] overflow-hidden font-mono text-2xl leading-[1.5em] select-none focus:outline-none"
		>
			<div ref={wordsRef} className="relative flex flex-wrap gap-x-[0.5em]">
				{/* Single caret — moved via DOM, not React state */}
				<span
					ref={caretRef}
					className="pointer-events-none absolute left-0 top-0 z-10 h-[1.2em] w-[2px] bg-primary opacity-0 animate-cursor-blink"
					style={{
						transition: "transform 100ms ease-out",
						willChange: "transform",
					}}
				/>

				{words.map((word, wordIndex) => (
					<span key={`${wordIndex}-${word.word}`} className="relative">
						{word.chars.map((char, charIndex) => (
							<span
								key={charIndex}
								data-w={wordIndex}
								data-c={charIndex}
								className={cn(
									char.state === "pending" && "text-muted-foreground",
									char.state === "correct" && "text-foreground",
									char.state === "incorrect" && "text-destructive",
									char.state === "extra" && "text-destructive underline",
									char.state === "missed" && "text-destructive/50",
								)}
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
