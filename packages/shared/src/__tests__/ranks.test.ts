import { describe, it, expect } from "bun:test";
import {
	getRankFromRating,
	getTierColor,
	getTierLabel,
	TIER_THRESHOLDS,
	TIER_COLORS,
	DIVISION_SIZE,
	type Tier,
} from "../ranks";

describe("getRankFromRating", () => {
	it("returns Gold III 33LP for default rating 1500", () => {
		const rank = getRankFromRating(1500);
		expect(rank.tier).toBe("Gold");
		expect(rank.division).toBe("III");
		expect(rank.lp).toBe(33);
		expect(rank.tierLabel).toBe("Gold III");
	});

	it("returns Bronze IV 0LP for rating 800", () => {
		const rank = getRankFromRating(800);
		expect(rank.tier).toBe("Bronze");
		expect(rank.division).toBe("IV");
		expect(rank.lp).toBe(0);
	});

	it("returns Master 100LP for rating 2400", () => {
		const rank = getRankFromRating(2400);
		expect(rank.tier).toBe("Master");
		expect(rank.division).toBeNull();
		expect(rank.lp).toBe(100);
		expect(rank.tierLabel).toBe("Master");
	});

	it("clamps below 800 to Bronze IV 0LP", () => {
		const rank = getRankFromRating(500);
		expect(rank.tier).toBe("Bronze");
		expect(rank.division).toBe("IV");
		expect(rank.lp).toBe(0);
	});

	it("returns Silver IV 0LP for rating exactly 1100", () => {
		const rank = getRankFromRating(1100);
		expect(rank.tier).toBe("Silver");
		expect(rank.division).toBe("IV");
		expect(rank.lp).toBe(0);
	});

	it("returns Bronze I 99LP for rating 1099", () => {
		const rank = getRankFromRating(1099);
		expect(rank.tier).toBe("Bronze");
		expect(rank.division).toBe("I");
		expect(rank.lp).toBe(99);
	});

	it("handles tier boundaries correctly", () => {
		const boundaries: [number, Tier, string][] = [
			[800, "Bronze", "IV"],
			[875, "Bronze", "III"],
			[950, "Bronze", "II"],
			[1025, "Bronze", "I"],
			[1100, "Silver", "IV"],
			[1175, "Silver", "III"],
			[1250, "Silver", "II"],
			[1325, "Silver", "I"],
			[1400, "Gold", "IV"],
			[1475, "Gold", "III"],
			[1550, "Gold", "II"],
			[1625, "Gold", "I"],
			[1700, "Platinum", "IV"],
			[1775, "Platinum", "III"],
			[1850, "Platinum", "II"],
			[1925, "Platinum", "I"],
			[2000, "Diamond", "IV"],
			[2075, "Diamond", "III"],
			[2150, "Diamond", "II"],
			[2225, "Diamond", "I"],
		];

		for (const [rating, expectedTier, expectedDiv] of boundaries) {
			const rank = getRankFromRating(rating);
			expect(rank.tier).toBe(expectedTier);
			expect(rank.division).toBe(expectedDiv);
			expect(rank.lp).toBe(0);
		}
	});

	it("returns Master with unbounded LP", () => {
		const rank = getRankFromRating(3000);
		expect(rank.tier).toBe("Master");
		expect(rank.division).toBeNull();
		expect(rank.lp).toBe(700);
	});

	it("LP is clamped to 0-99 for normal tiers", () => {
		// Mid-division
		const rank = getRankFromRating(1437);
		expect(rank.tier).toBe("Gold");
		expect(rank.division).toBe("IV");
		expect(rank.lp).toBe(49);
	});
});

describe("getTierColor", () => {
	it("returns correct colors", () => {
		expect(getTierColor("Bronze")).toBe("#CD7F32");
		expect(getTierColor("Gold")).toBe("#FFD700");
		expect(getTierColor("Master")).toBe("#FF6E40");
	});
});

describe("getTierLabel", () => {
	it("formats tier + division", () => {
		expect(getTierLabel("Gold", "IV")).toBe("Gold IV");
		expect(getTierLabel("Diamond", "I")).toBe("Diamond I");
	});

	it("formats Master without division", () => {
		expect(getTierLabel("Master", null)).toBe("Master");
	});
});
