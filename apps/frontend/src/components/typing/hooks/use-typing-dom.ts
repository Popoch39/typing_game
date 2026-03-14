import { useEffect, useRef, useState } from "react";
import type { WordState } from "@/lib/typing-engine";
import { useTypingStore } from "@/stores/use-typing-store";

type TypingDomRefs = {
	container: React.RefObject<HTMLDivElement | null>;
	words: React.RefObject<HTMLDivElement | null>;
	caret: React.RefObject<HTMLSpanElement | null>;
};

export function useTypingDom(refs: TypingDomRefs) {
	const [initialWords, setInitialWords] = useState<WordState[]>([]);
	const lineHeightRef = useRef(0);
	const prevWordIndexRef = useRef(0);

	// Set initial words on mount
	useEffect(() => {
		setInitialWords(useTypingStore.getState().words);
	}, []);

	// Single Zustand subscription — all DOM mutations
	useEffect(() => {
		const unsub = useTypingStore.subscribe((state, prevState) => {
			// Full reset → trigger React re-render
			if (
				state.currentWordIndex === 0 &&
				state.currentCharIndex === 0 &&
				state.words !== prevState.words &&
				!state.isRunning
			) {
				prevWordIndexRef.current = 0;
				setInitialWords(state.words);
				return;
			}

			const wordsEl = refs.words.current;
			if (!wordsEl) return;

			syncWordChars(wordsEl, state, prevWordIndexRef.current);
			positionCaret(
				refs.caret.current,
				wordsEl,
				refs.container.current,
				state,
				lineHeightRef,
			);

			prevWordIndexRef.current = state.currentWordIndex;
		});

		return unsub;
	}, [refs]);

	return initialWords;
}

// --- Pure DOM helpers ---

function syncWordChars(
	wordsEl: HTMLDivElement,
	state: { words: WordState[]; currentWordIndex: number },
	prevWordIndex: number,
) {
	const wordsToUpdate = new Set([state.currentWordIndex, prevWordIndex]);

	for (const wi of wordsToUpdate) {
		const word = state.words[wi];
		if (!word) continue;

		// Sync char data-state attributes
		for (let ci = 0; ci < word.chars.length; ci++) {
			const el = wordsEl.querySelector<HTMLSpanElement>(
				`[data-w="${wi}"][data-c="${ci}"]`,
			);
			if (el && el.dataset.state !== word.chars[ci].state) {
				el.dataset.state = word.chars[ci].state;
			}
		}

		const wordEl = wordsEl.querySelector<HTMLSpanElement>(
			`[data-w="${wi}"][data-c="0"]`,
		)?.parentElement;
		if (!wordEl) continue;
		const domCharCount = wordEl.querySelectorAll(`[data-w="${wi}"]`).length;

		// Remove extra chars (backspace)
		if (domCharCount > word.chars.length) {
			for (let ci = word.chars.length; ci < domCharCount; ci++) {
				const el = wordsEl.querySelector<HTMLSpanElement>(
					`[data-w="${wi}"][data-c="${ci}"]`,
				);
				if (el) el.remove();
			}
		}

		// Add extra chars (overflow typing)
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

function positionCaret(
	caret: HTMLSpanElement | null,
	wordsEl: HTMLDivElement,
	scrollEl: HTMLDivElement | null,
	state: {
		currentWordIndex: number;
		currentCharIndex: number;
		isComplete: boolean;
		isRunning: boolean;
	},
	lineHeightRef: React.RefObject<number>,
) {
	if (!caret) return;

	if (state.isComplete) {
		caret.style.opacity = "0";
		return;
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

	// Auto-scroll
	if (scrollEl) {
		if (!lineHeightRef.current) {
			lineHeightRef.current =
				parseFloat(getComputedStyle(scrollEl).lineHeight) || 40;
		}
		const targetScroll = Math.max(0, top - lineHeightRef.current);
		if (scrollEl.scrollTop !== targetScroll) {
			scrollEl.scrollTop = targetScroll;
		}
	}

	// Toggle blink
	if (state.isRunning) {
		caret.classList.remove("animate-cursor-blink");
	} else {
		caret.classList.add("animate-cursor-blink");
	}
}
