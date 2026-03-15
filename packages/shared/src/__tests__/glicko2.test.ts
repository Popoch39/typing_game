import { describe, it, expect } from "bun:test";
import {
	computeGlicko2,
	decayRD,
	expectedScore,
	DEFAULT_RATING,
	DEFAULT_RD,
	DEFAULT_VOLATILITY,
	TAU,
	CONVERGENCE_TOLERANCE,
	type GlickoPlayer,
	type GlickoResult,
} from "../glicko2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultPlayer = (): GlickoPlayer => ({
	rating: DEFAULT_RATING,
	rd: DEFAULT_RD,
	volatility: DEFAULT_VOLATILITY,
});

const strongPlayer = (): GlickoPlayer => ({
	rating: 1800,
	rd: 100,
	volatility: DEFAULT_VOLATILITY,
});

const weakPlayer = (): GlickoPlayer => ({
	rating: 1200,
	rd: 100,
	volatility: DEFAULT_VOLATILITY,
});

const settledPlayer = (): GlickoPlayer => ({
	rating: 1500,
	rd: 50,
	volatility: DEFAULT_VOLATILITY,
});

const highRDPlayer = (): GlickoPlayer => ({
	rating: 1500,
	rd: 350,
	volatility: DEFAULT_VOLATILITY,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("Glicko-2 constants", () => {
	it("DEFAULT_RATING is 1500", () => {
		expect(DEFAULT_RATING).toBe(1500);
	});

	it("DEFAULT_RD is 350", () => {
		expect(DEFAULT_RD).toBe(350);
	});

	it("DEFAULT_VOLATILITY is 0.06", () => {
		expect(DEFAULT_VOLATILITY).toBe(0.06);
	});

	it("TAU is 0.5", () => {
		expect(TAU).toBe(0.5);
	});

	it("CONVERGENCE_TOLERANCE is 0.000001", () => {
		expect(CONVERGENCE_TOLERANCE).toBe(0.000001);
	});
});

// ---------------------------------------------------------------------------
// expectedScore
// ---------------------------------------------------------------------------

describe("expectedScore", () => {
	it("returns approximately 0.5 for equal players", () => {
		const a = defaultPlayer();
		const b = defaultPlayer();
		const score = expectedScore(a, b);
		expect(score).toBeCloseTo(0.5, 2);
	});

	it("returns > 0.5 for the stronger player", () => {
		const score = expectedScore(strongPlayer(), weakPlayer());
		expect(score).toBeGreaterThan(0.5);
	});

	it("returns < 0.5 for the weaker player", () => {
		const score = expectedScore(weakPlayer(), strongPlayer());
		expect(score).toBeLessThan(0.5);
	});

	it("is symmetric — expectedScore(A,B) + expectedScore(B,A) ≈ 1.0", () => {
		const a = strongPlayer();
		const b = weakPlayer();
		const sum = expectedScore(a, b) + expectedScore(b, a);
		expect(sum).toBeCloseTo(1.0, 5);
	});

	it("approaches 1.0 for a very large rating gap", () => {
		const dominant: GlickoPlayer = { rating: 2500, rd: 50, volatility: 0.06 };
		const novice: GlickoPlayer = { rating: 500, rd: 50, volatility: 0.06 };
		const score = expectedScore(dominant, novice);
		expect(score).toBeGreaterThan(0.99);
	});

	it("moves closer to 0.5 when RD is very high (more uncertainty)", () => {
		const certain = expectedScore(
			{ rating: 1700, rd: 50, volatility: 0.06 },
			{ rating: 1500, rd: 50, volatility: 0.06 },
		);
		const uncertain = expectedScore(
			{ rating: 1700, rd: 300, volatility: 0.06 },
			{ rating: 1500, rd: 300, volatility: 0.06 },
		);
		// With higher RD, the expected score should be closer to 0.5
		expect(Math.abs(uncertain - 0.5)).toBeLessThan(Math.abs(certain - 0.5));
	});
});

// ---------------------------------------------------------------------------
// computeGlicko2
// ---------------------------------------------------------------------------

describe("computeGlicko2", () => {
	describe("equal players", () => {
		it("winner gains rating, loser loses rating", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const winnerResult = computeGlicko2(a, b, 1.0);
			const loserResult = computeGlicko2(b, a, 0.0);
			expect(winnerResult.rating).toBeGreaterThan(DEFAULT_RATING);
			expect(loserResult.rating).toBeLessThan(DEFAULT_RATING);
		});

		it("produces symmetric rating changes", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const winnerResult = computeGlicko2(a, b, 1.0);
			const loserResult = computeGlicko2(b, a, 0.0);
			const gain = winnerResult.rating - DEFAULT_RATING;
			const loss = DEFAULT_RATING - loserResult.rating;
			expect(gain).toBeCloseTo(loss, 0);
		});

		it("draw keeps ratings approximately the same", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const result = computeGlicko2(a, b, 0.5);
			expect(result.rating).toBeCloseTo(DEFAULT_RATING, 0);
		});
	});

	describe("rating changes based on strength", () => {
		it("strong beats weak → smaller rating gain than upset", () => {
			const s = strongPlayer();
			const w = weakPlayer();
			const expectedGain = computeGlicko2(s, w, 1.0);
			const upsetGain = computeGlicko2(w, s, 1.0);
			const normalChange = expectedGain.rating - s.rating;
			const upsetChange = upsetGain.rating - w.rating;
			expect(upsetChange).toBeGreaterThan(normalChange);
		});

		it("weak beats strong → upset produces larger rating change", () => {
			const s = strongPlayer();
			const w = weakPlayer();
			const upsetResult = computeGlicko2(w, s, 1.0);
			expect(upsetResult.rating - w.rating).toBeGreaterThan(0);
			// The upset gain should be substantial
			expect(upsetResult.rating - w.rating).toBeGreaterThan(10);
		});
	});

	describe("RD behavior", () => {
		it("RD decreases after a game for both players", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const resultA = computeGlicko2(a, b, 1.0);
			const resultB = computeGlicko2(b, a, 0.0);
			expect(resultA.rd).toBeLessThan(a.rd);
			expect(resultB.rd).toBeLessThan(b.rd);
		});

		it("very high RD player (350) has large rating change and significant RD decrease", () => {
			const a = highRDPlayer();
			const b = settledPlayer();
			const result = computeGlicko2(a, b, 1.0);
			// Large RD → large swing
			expect(result.rating - a.rating).toBeGreaterThan(30);
			// RD should decrease significantly
			expect(a.rd - result.rd).toBeGreaterThan(50);
		});

		it("very low RD player (50) has small rating change", () => {
			const a = settledPlayer();
			const b = settledPlayer();
			const result = computeGlicko2(a, b, 1.0);
			// Low RD → small swing
			expect(Math.abs(result.rating - a.rating)).toBeLessThan(30);
		});
	});

	describe("volatility behavior", () => {
		it("volatility stays bounded between 0 and 0.1", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const result = computeGlicko2(a, b, 1.0);
			expect(result.volatility).toBeGreaterThan(0);
			expect(result.volatility).toBeLessThan(0.1);
		});
	});

	describe("win/loss/draw consistency", () => {
		it("score=1.0 always increases rating", () => {
			const scenarios: [GlickoPlayer, GlickoPlayer][] = [
				[defaultPlayer(), defaultPlayer()],
				[weakPlayer(), strongPlayer()],
				[strongPlayer(), weakPlayer()],
				[settledPlayer(), highRDPlayer()],
			];
			for (const [a, b] of scenarios) {
				const result = computeGlicko2(a, b, 1.0);
				expect(result.rating).toBeGreaterThan(a.rating);
			}
		});

		it("score=0.0 always decreases rating", () => {
			const scenarios: [GlickoPlayer, GlickoPlayer][] = [
				[defaultPlayer(), defaultPlayer()],
				[weakPlayer(), strongPlayer()],
				[strongPlayer(), weakPlayer()],
				[settledPlayer(), highRDPlayer()],
			];
			for (const [a, b] of scenarios) {
				const result = computeGlicko2(a, b, 0.0);
				expect(result.rating).toBeLessThan(a.rating);
			}
		});

		it("draw between equal players produces minimal change", () => {
			const a = settledPlayer();
			const b = settledPlayer();
			const result = computeGlicko2(a, b, 0.5);
			expect(Math.abs(result.rating - a.rating)).toBeLessThan(1);
		});
	});

	describe("scale conversion", () => {
		it("result rating is on Glicko-1 scale (around 1500 range)", () => {
			const a = defaultPlayer();
			const b = defaultPlayer();
			const result = computeGlicko2(a, b, 1.0);
			// Should be in a reasonable Glicko-1 range, not Glicko-2 internal scale (around 0)
			expect(result.rating).toBeGreaterThan(100);
			expect(result.rating).toBeLessThan(3500);
		});
	});

	describe("numerical stability", () => {
		it("result rating is always a finite number (no NaN/Infinity)", () => {
			const pairs: [GlickoPlayer, GlickoPlayer, number][] = [
				[defaultPlayer(), defaultPlayer(), 1.0],
				[defaultPlayer(), defaultPlayer(), 0.0],
				[defaultPlayer(), defaultPlayer(), 0.5],
				[strongPlayer(), weakPlayer(), 1.0],
				[weakPlayer(), strongPlayer(), 1.0],
				[highRDPlayer(), settledPlayer(), 0.5],
			];
			for (const [a, b, score] of pairs) {
				const result = computeGlicko2(a, b, score);
				expect(Number.isFinite(result.rating)).toBe(true);
				expect(Number.isFinite(result.rd)).toBe(true);
				expect(Number.isFinite(result.volatility)).toBe(true);
			}
		});
	});
});

// ---------------------------------------------------------------------------
// decayRD
// ---------------------------------------------------------------------------

describe("decayRD", () => {
	it("returns the same RD when 0 days have passed", () => {
		const player = settledPlayer();
		const result = decayRD(player, 0);
		expect(result).toBe(player.rd);
	});

	it("increases RD when positive days have passed", () => {
		const player = settledPlayer();
		const result = decayRD(player, 30);
		expect(result).toBeGreaterThan(player.rd);
	});

	it("caps RD at DEFAULT_RD (350) for very large inactivity periods", () => {
		const player = settledPlayer();
		const result = decayRD(player, 10000);
		expect(result).toBeLessThanOrEqual(DEFAULT_RD);
	});

	it("RD never exceeds DEFAULT_RD", () => {
		const player: GlickoPlayer = { rating: 1500, rd: 300, volatility: 0.06 };
		const result = decayRD(player, 365);
		expect(result).toBeLessThanOrEqual(DEFAULT_RD);
	});

	it("stays at max when already at DEFAULT_RD", () => {
		const player: GlickoPlayer = { rating: 1500, rd: DEFAULT_RD, volatility: 0.06 };
		const result = decayRD(player, 30);
		expect(result).toBe(DEFAULT_RD);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles max volatility player without diverging", () => {
		const highVol: GlickoPlayer = { rating: 1500, rd: 200, volatility: 0.09 };
		const opponent = defaultPlayer();
		const result = computeGlicko2(highVol, opponent, 1.0);
		expect(Number.isFinite(result.rating)).toBe(true);
		expect(Number.isFinite(result.rd)).toBe(true);
		expect(Number.isFinite(result.volatility)).toBe(true);
		expect(result.volatility).toBeGreaterThan(0);
	});

	it("handles minimum RD (30)", () => {
		const lowRD: GlickoPlayer = { rating: 1500, rd: 30, volatility: 0.06 };
		const opponent = defaultPlayer();
		const result = computeGlicko2(lowRD, opponent, 1.0);
		expect(Number.isFinite(result.rating)).toBe(true);
		expect(result.rating).toBeGreaterThan(lowRD.rating);
	});

	it("handles rating of 0", () => {
		const zeroRating: GlickoPlayer = { rating: 0, rd: 200, volatility: 0.06 };
		const opponent = defaultPlayer();
		const result = computeGlicko2(zeroRating, opponent, 1.0);
		expect(Number.isFinite(result.rating)).toBe(true);
		expect(result.rating).toBeGreaterThan(0);
	});

	it("handles rating of 3000", () => {
		const highRating: GlickoPlayer = { rating: 3000, rd: 200, volatility: 0.06 };
		const opponent = defaultPlayer();
		const result = computeGlicko2(highRating, opponent, 0.0);
		expect(Number.isFinite(result.rating)).toBe(true);
		expect(result.rating).toBeLessThan(3000);
	});
});
