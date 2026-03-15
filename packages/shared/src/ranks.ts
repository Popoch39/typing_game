// ---------------------------------------------------------------------------
// Tier / Division / LP system — derived from Glicko-2 rating
// ---------------------------------------------------------------------------

export const TIERS = [
	"Bronze",
	"Silver",
	"Gold",
	"Platinum",
	"Diamond",
	"Master",
] as const;

export type Tier = (typeof TIERS)[number];

export const DIVISIONS = ["IV", "III", "II", "I"] as const;
export type Division = (typeof DIVISIONS)[number];

export const DIVISION_SIZE = 75;

export const TIER_THRESHOLDS: Record<Tier, number> = {
	Bronze: 800,
	Silver: 1100,
	Gold: 1400,
	Platinum: 1700,
	Diamond: 2000,
	Master: 2300,
};

export const TIER_COLORS: Record<Tier, string> = {
	Bronze: "#CD7F32",
	Silver: "#C0C0C0",
	Gold: "#FFD700",
	Platinum: "#4DD0E1",
	Diamond: "#B388FF",
	Master: "#FF6E40",
};

export interface RankInfo {
	tier: Tier;
	division: Division | null;
	lp: number;
	tierLabel: string;
}

const RATING_FLOOR = 800;

export function getRankFromRating(rating: number): RankInfo {
	const clamped = Math.max(RATING_FLOOR, rating);

	// Master tier — no divisions, LP = rating - 2300
	if (clamped >= TIER_THRESHOLDS.Master) {
		return {
			tier: "Master",
			division: null,
			lp: Math.round(clamped - TIER_THRESHOLDS.Master),
			tierLabel: "Master",
		};
	}

	// Find the tier (iterate in reverse to match highest first)
	let tier: Tier = "Bronze";
	for (let i = TIERS.length - 2; i >= 0; i--) {
		if (clamped >= TIER_THRESHOLDS[TIERS[i]]) {
			tier = TIERS[i];
			break;
		}
	}

	const tierFloor = TIER_THRESHOLDS[tier];
	const ratingInTier = clamped - tierFloor;
	const divIndex = Math.min(3, Math.floor(ratingInTier / DIVISION_SIZE));
	const division = DIVISIONS[divIndex];
	const divisionFloor = tierFloor + divIndex * DIVISION_SIZE;
	const lp = Math.min(
		99,
		Math.max(
			0,
			Math.round(((clamped - divisionFloor) / DIVISION_SIZE) * 100),
		),
	);

	return {
		tier,
		division,
		lp,
		tierLabel: getTierLabel(tier, division),
	};
}

export function getTierColor(tier: Tier): string {
	return TIER_COLORS[tier];
}

export function getTierLabel(tier: Tier, division: Division | null): string {
	if (division === null) return tier;
	return `${tier} ${division}`;
}
