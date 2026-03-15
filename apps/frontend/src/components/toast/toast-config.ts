import { Flame, Star, Swords, TrendingUp, Trophy } from "lucide-react";

export type ToastType =
	| "match-found"
	| "victory"
	| "defeat"
	| "achievement"
	| "rank-up"
	| "streak";

export const toastConfig: Record<
	ToastType,
	{
		icon: React.ElementType;
		iconClass: string;
		bgClass: string;
		borderClass: string;
	}
> = {
	"match-found": {
		icon: Swords,
		iconClass: "text-primary",
		bgClass: "bg-primary/10",
		borderClass: "border-l-primary",
	},
	victory: {
		icon: Trophy,
		iconClass: "text-green-500",
		bgClass: "bg-green-500/10",
		borderClass: "border-l-green-500",
	},
	defeat: {
		icon: Swords,
		iconClass: "text-destructive",
		bgClass: "bg-destructive/10",
		borderClass: "border-l-destructive",
	},
	achievement: {
		icon: Star,
		iconClass: "text-amber-500",
		bgClass: "bg-amber-500/10",
		borderClass: "border-l-amber-500",
	},
	"rank-up": {
		icon: TrendingUp,
		iconClass: "text-primary",
		bgClass: "bg-primary/10",
		borderClass: "border-l-primary",
	},
	streak: {
		icon: Flame,
		iconClass: "text-orange-500",
		bgClass: "bg-orange-500/10",
		borderClass: "border-l-orange-500",
	},
};
