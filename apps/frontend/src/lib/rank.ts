export type RankTier =
	| "Bronze"
	| "Silver"
	| "Gold"
	| "Platinum"
	| "Diamond"
	| "Master"
	| "Grandmaster";

export type RankDivision = "I" | "II" | "III" | "IV";

export interface RankInfo {
	tier: RankTier;
	division: RankDivision;
	lp: number;
	color: string;
	bgColor: string;
	borderColor: string;
	ringColor: string;
	minLp: number;
	maxLp: number;
}

export const rankTiers: Record<
	RankTier,
	{
		color: string;
		bgColor: string;
		borderColor: string;
		ringColor: string;
		minLp: number;
	}
> = {
	Bronze: {
		color: "text-amber-700",
		bgColor: "bg-amber-700/10",
		borderColor: "border-amber-700/30",
		ringColor: "ring-amber-700",
		minLp: 0,
	},
	Silver: {
		color: "text-slate-400",
		bgColor: "bg-slate-400/10",
		borderColor: "border-slate-400/30",
		ringColor: "ring-slate-400",
		minLp: 1000,
	},
	Gold: {
		color: "text-amber-500",
		bgColor: "bg-amber-500/10",
		borderColor: "border-amber-500/30",
		ringColor: "ring-amber-500",
		minLp: 2000,
	},
	Platinum: {
		color: "text-cyan-400",
		bgColor: "bg-cyan-400/10",
		borderColor: "border-cyan-400/30",
		ringColor: "ring-cyan-400",
		minLp: 3000,
	},
	Diamond: {
		color: "text-primary",
		bgColor: "bg-primary/10",
		borderColor: "border-primary/30",
		ringColor: "ring-primary",
		minLp: 4000,
	},
	Master: {
		color: "text-purple-500",
		bgColor: "bg-purple-500/10",
		borderColor: "border-purple-500/30",
		ringColor: "ring-purple-500",
		minLp: 5000,
	},
	Grandmaster: {
		color: "text-red-500",
		bgColor: "bg-red-500/10",
		borderColor: "border-red-500/30",
		ringColor: "ring-red-500",
		minLp: 6000,
	},
};

export function getRankFromLp(lp: number): RankInfo {
	const tiers = Object.entries(rankTiers).reverse();

	for (const [tier, config] of tiers) {
		if (lp >= config.minLp) {
			const tierLp = lp - config.minLp;
			const division =
				tierLp < 250 ? "IV" : tierLp < 500 ? "III" : tierLp < 750 ? "II" : "I";

			return {
				tier: tier as RankTier,
				division,
				lp,
				...config,
				maxLp: config.minLp + 1000,
			};
		}
	}

	return {
		tier: "Bronze",
		division: "IV",
		lp,
		...rankTiers.Bronze,
		maxLp: 1000,
	};
}

export function getNextRank(current: RankInfo): string {
	if (current.division !== "I") {
		const divisions: RankDivision[] = ["IV", "III", "II", "I"];
		const currentIndex = divisions.indexOf(current.division);
		return `${current.tier} ${divisions[currentIndex + 1]}`;
	}

	const tierOrder: RankTier[] = [
		"Bronze",
		"Silver",
		"Gold",
		"Platinum",
		"Diamond",
		"Master",
		"Grandmaster",
	];
	const currentIndex = tierOrder.indexOf(current.tier);

	if (currentIndex < tierOrder.length - 1) {
		return `${tierOrder[currentIndex + 1]} IV`;
	}

	return "Grandmaster I";
}

export function getLpProgress(rank: RankInfo): number {
	const tierLp = rank.lp - rankTiers[rank.tier].minLp;
	const divisionLp = tierLp % 250;
	return (divisionLp / 250) * 100;
}
