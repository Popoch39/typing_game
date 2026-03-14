import { create } from "zustand";
import {
	type EngineState,
	TypingEngine,
	type WordState,
} from "@/lib/typing-engine";
import { generateWordList } from "@/lib/word-lists";

const WORD_COUNT = 100;

interface TypingStore {
	engine: TypingEngine | null;
	// Mirrored state from engine
	words: WordState[];
	wordsVersion: number;
	currentWordIndex: number;
	currentCharIndex: number;
	timeRemaining: number;
	duration: number;
	mode: string;
	isRunning: boolean;
	isComplete: boolean;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	wpmHistory: { time: number; wpm: number }[];
	correctChars: number;
	incorrectChars: number;
	totalCharsTyped: number;
	score: number;
	combo: number;
	lastWordScore: number;
	lastWordIsPerfect: boolean;
	// 1v1 reserved
	opponent: EngineState | null;
	// Actions
	init: () => void;
	reset: () => void;
	handleKeyPress: (e: KeyboardEvent) => void;
	setDuration: (duration: number) => void;
	setMode: (mode: string) => void;
	syncFromEngine: () => void;
	syncStatsOnly: () => void;
}

export const useTypingStore = create<TypingStore>((set, get) => ({
	engine: null,
	words: [],
	wordsVersion: 0,
	currentWordIndex: 0,
	currentCharIndex: 0,
	timeRemaining: 30,
	duration: 30,
	mode: "words",
	isRunning: false,
	isComplete: false,
	wpm: 0,
	rawWpm: 0,
	accuracy: 100,
	wpmHistory: [],
	correctChars: 0,
	incorrectChars: 0,
	totalCharsTyped: 0,
	score: 0,
	combo: 1.0,
	lastWordScore: 0,
	lastWordIsPerfect: false,
	opponent: null,

	syncFromEngine: () => {
		const { engine, wordsVersion } = get();
		if (!engine) return;
		const state = engine.getState();
		const words = [...state.words];
		set({
			words,
			wordsVersion: wordsVersion + 1,
			currentWordIndex: state.currentWordIndex,
			currentCharIndex: state.currentCharIndex,
			timeRemaining: state.timeRemaining,
			duration: state.duration,
			mode: state.mode,
			isRunning: state.isRunning,
			isComplete: state.isComplete,
			wpm: state.wpm,
			rawWpm: state.rawWpm,
			accuracy: state.accuracy,
			wpmHistory: state.wpmHistory,
			correctChars: state.correctChars,
			incorrectChars: state.incorrectChars,
			totalCharsTyped: state.totalCharsTyped,
			score: state.score,
			combo: state.combo,
			lastWordScore: state.lastWordScore,
			lastWordIsPerfect: state.lastWordIsPerfect,
		});
	},

	// Lightweight sync for timer ticks — only stats, no words array
	syncStatsOnly: () => {
		const { engine } = get();
		if (!engine) return;
		const state = engine.getState();
		set({
			timeRemaining: state.timeRemaining,
			wpm: state.wpm,
			rawWpm: state.rawWpm,
			accuracy: state.accuracy,
			isRunning: state.isRunning,
			isComplete: state.isComplete,
			wpmHistory: state.wpmHistory,
			score: state.score,
			combo: state.combo,
			lastWordScore: state.lastWordScore,
		});
	},

	init: () => {
		const { engine: prev, duration, mode } = get();
		if (prev) prev.destroy();

		const wordList = generateWordList("words", WORD_COUNT);
		const syncFromEngine = get().syncFromEngine;
		const syncStatsOnly = get().syncStatsOnly;

		const engine = new TypingEngine(wordList, duration, mode, {
			onStateChange: syncFromEngine,
			onTick: syncStatsOnly,
			onComplete: syncFromEngine,
		});

		set({ engine });
		syncFromEngine();
	},

	reset: () => {
		const { engine, duration } = get();
		if (engine) {
			const wordList = generateWordList("words", WORD_COUNT);
			engine.reset(wordList);
		} else {
			get().init();
		}
	},

	handleKeyPress: (e: KeyboardEvent) => {
		const { engine, isComplete, isRunning } = get();

		// Tab + Enter = restart
		if (e.key === "Tab") {
			e.preventDefault();
			return;
		}
		if (e.key === "Enter" && isComplete) {
			e.preventDefault();
			get().reset();
			return;
		}

		if (!engine || isComplete) return;

		// Don't handle if typing in an input/textarea
		const target = e.target as HTMLElement;
		if (
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable
		) {
			return;
		}

		if (e.key === "Backspace") {
			e.preventDefault();
			if (e.ctrlKey) {
				engine.handleCtrlBackspace();
			} else {
				engine.handleBackspace();
			}
		} else if (e.key === " ") {
			e.preventDefault();
			engine.handleSpace();
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			engine.handleChar(e.key);
		}
	},

	setDuration: (duration: number) => {
		const { isRunning } = get();
		if (isRunning) return;
		set({ duration, timeRemaining: duration });
		get().init();
	},

	setMode: (mode: string) => {
		const { isRunning } = get();
		if (isRunning) return;
		set({ mode });
		get().init();
	},
}));
