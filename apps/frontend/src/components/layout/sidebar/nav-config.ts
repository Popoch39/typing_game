import {
	BarChart3,
	Crown,
	Gamepad2,
	Settings,
	Swords,
	Trophy,
	User,
} from "lucide-react";

export const navItems = [
	{
		label: "Play",
		icon: Gamepad2,
		href: "/",
		description: "Find a match",
	},
	{
		label: "Profile",
		icon: User,
		href: "/profile",
		description: "Your stats",
	},
	{
		label: "Ranked",
		icon: Crown,
		href: "/ranked",
		description: "Competitive",
	},
	{
		label: "Leaderboard",
		icon: Trophy,
		href: "/leaderboard",
		description: "Top players",
	},
	{
		label: "Match History",
		icon: Swords,
		href: "/history",
		description: "Past games",
	},
	{
		label: "Stats",
		icon: BarChart3,
		href: "/stats",
		description: "Analytics",
	},
];

export const bottomItems = [
	{
		label: "Settings",
		icon: Settings,
		href: "/settings",
		description: "Preferences",
	},
];

// Rank colors for avatar borders
export const rankColors: Record<string, string> = {
	Bronze: "ring-amber-700",
	Silver: "ring-slate-400",
	Gold: "ring-amber-500",
	Platinum: "ring-cyan-400",
	Diamond: "ring-primary",
	Master: "ring-purple-500",
	Grandmaster: "ring-red-500",
};
