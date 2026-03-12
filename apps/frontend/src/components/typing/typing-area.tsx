"use client";

import { useEffect, useRef, useState } from "react";
import { useTypingStore } from "@/stores/use-typing-store";
import type { WordState } from "@/lib/typing-engine";
import { ScorePopup } from "./score-popup";
import { cn } from "@/lib/utils";

export function TypingArea() {
	const [initialWords, setInitialWords] = useState<WordState[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
	const wordsRef = useRef<HTMLDivElement>(null);
	const caretRef = useRef<HTMLSpanElement>(null);
	const lineHeightRef = useRef<number>(0);
	const prevWordIndexRef = useRef(0);
	const prevCharIndexRef = useRef(0);
	const combo = useTypingStore((s) => s.combo);
	const isRunning = useTypingStore((s) => s.isRunning);

	// Set initial words + re-render only on reset/init
	useEffect(() => {
		setInitialWords(useTypingStore.getState().words);
	}, []);

	// All updates via direct DOM mutation — no React re-renders
	useEffect(() => {
		const unsub = useTypingStore.subscribe((state, prevState) => {
			// Full reset: new word list → trigger React re-render
			if (
				state.currentWordIndex === 0 &&
				state.currentCharIndex === 0 &&
				state.words !== prevState.words &&
				!state.isRunning
			) {
				prevWordIndexRef.current = 0;
				prevCharIndexRef.current = 0;
				setInitialWords(state.words);
				return;
			}
			const wordsEl = wordsRef.current;
			const caret = caretRef.current;
			const scrollEl = containerRef.current;
			if (!wordsEl) return;

			const prevWi = prevWordIndexRef.current;

			// Update only the words that could have changed: current and previous
			const wordsToUpdate = new Set([state.currentWordIndex, prevWi]);
			for (const wi of wordsToUpdate) {
				const word = state.words[wi];
				if (!word) continue;

				// Sync all char states
				for (let ci = 0; ci < word.chars.length; ci++) {
					const el = wordsEl.querySelector<HTMLSpanElement>(
						`[data-w="${wi}"][data-c="${ci}"]`,
					);
					if (el && el.dataset.state !== word.chars[ci].state) {
						el.dataset.state = word.chars[ci].state;
					}
				}

				// Count current DOM chars for this word
				const wordEl = wordsEl.querySelector<HTMLSpanElement>(
					`[data-w="${wi}"][data-c="0"]`,
				)?.parentElement;
				if (!wordEl) continue;
				const domCharCount = wordEl.querySelectorAll(`[data-w="${wi}"]`).length;

				// Remove extra chars on backspace
				if (domCharCount > word.chars.length) {
					for (let ci = word.chars.length; ci < domCharCount; ci++) {
						const el = wordsEl.querySelector<HTMLSpanElement>(
							`[data-w="${wi}"][data-c="${ci}"]`,
						);
						if (el) el.remove();
					}
				}

				// Add extra chars
				if (word.chars.length > domCharCount) {
					for (let ci = domCharCount; ci < word.chars.length; ci++) {
						const span = document.createElement("span");
						span.dataset.w = String(wi);
						span.dataset.c = String(ci);
						span.dataset.state = word.chars[ci].state;
						span.textContent = word.chars[ci].char;
						wordEl.appendChild(span);
					}
				}
			}

			prevWordIndexRef.current = state.currentWordIndex;
			prevCharIndexRef.current = state.currentCharIndex;

			// Move caret
			if (caret && wordsEl) {
				if (state.isComplete) {
					caret.style.opacity = "0";
				} else {
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
						`[data-w="${state.currentWordIndex}"][data-c="${state.currentCharIndex}"]`,
					);
					if (currentEl) {
						({ left, top } = getOffsetRelativeTo(currentEl, wordsEl));
					} else {
						const prevEl = wordsEl.querySelector<HTMLSpanElement>(
							`[data-w="${state.currentWordIndex}"][data-c="${state.currentCharIndex - 1}"]`,
						);
						if (prevEl) {
							const pos = getOffsetRelativeTo(prevEl, wordsEl);
							left = pos.left + prevEl.offsetWidth;
							top = pos.top;
						}
					}

					caret.style.transform = `translate(${left}px, ${top}px)`;
					caret.style.opacity = "1";

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
				}

				// Toggle blink
				if (state.isRunning) {
					caret.classList.remove("animate-cursor-blink");
				} else {
					caret.classList.add("animate-cursor-blink");
				}
			}

		});

		return unsub;
	}, []);

	if (initialWords.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative h-[4.5em] overflow-hidden font-sans font-bold text-5xl leading-[1.5em] select-none focus:outline-none rounded-lg transition-shadow duration-300",
				isRunning && combo >= 5.0 && "shadow-[0_0_30px_rgba(239,68,68,0.5)] ring-2 ring-red-500/50",
				isRunning && combo >= 3.0 && combo < 5.0 && "shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-1 ring-orange-500/30",
			)}
		>
			<ScorePopup />
			<div ref={wordsRef} className="relative flex flex-wrap gap-x-[0.5em]">
				<span
					ref={caretRef}
					className="pointer-events-none absolute left-0 top-0 z-10 h-[1.2em] w-[2px] bg-primary opacity-0 animate-cursor-blink"
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
