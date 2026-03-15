"use client";

import { cn } from "@/lib/utils";
import { getRankFromLp, type RankTier } from "@/lib/rank";
import { Trophy, Crown, Shield, Star, Gem, Award, Flame } from "lucide-react";

const rankIcons: Record<RankTier, React.ElementType> = {
  Bronze: Shield,
  Silver: Shield,
  Gold: Crown,
  Platinum: Gem,
  Diamond: Gem,
  Master: Star,
  Grandmaster: Flame,
};

interface RankBadgeProps {
  lp?: number;
  tier?: RankTier;
  division?: string;
  size?: "sm" | "md" | "lg";
  showLp?: boolean;
  className?: string;
}

export function RankBadge({
  lp = 4078,
  tier,
  division,
  size = "md",
  showLp = false,
  className,
}: RankBadgeProps) {
  const rank = tier
    ? {
      tier,
      division: division || "II",
      ...getRankFromLp(lp),
    }
    : getRankFromLp(lp);

  const Icon = rankIcons[rank.tier];

  const sizes = {
    sm: {
      container: "gap-1.5 px-2 py-1",
      icon: "h-3.5 w-3.5",
      text: "text-xs",
      lpText: "text-[10px]",
    },
    md: {
      container: "gap-2 px-3 py-1.5",
      icon: "h-4 w-4",
      text: "text-sm",
      lpText: "text-xs",
    },
    lg: {
      container: "gap-2.5 px-4 py-2",
      icon: "h-5 w-5",
      text: "text-base",
      lpText: "text-sm",
    },
  };

  const s = sizes[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border transition-all duration-200",
        "hover:elevation-1",
        rank.bgColor,
        rank.borderColor,
        s.container,
        className,
      )}
    >
      <Icon className={cn(s.icon, rank.color)} />
      <span className={cn("font-semibold", s.text, rank.color)}>
        {rank.tier} {rank.division}
      </span>
      {showLp && (
        <span className={cn("text-muted-foreground", s.lpText)}>
          ({rank.lp} LP)
        </span>
      )}
    </div>
  );
}

interface RankAvatarProps {
  initials: string;
  lp?: number;
  tier?: RankTier;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  status?: "online" | "offline" | "in-game" | "away";
  className?: string;
}

export function RankAvatar({
  initials,
  lp = 4078,
  tier,
  size = "md",
  showStatus = false,
  status = "online",
  className,
}: RankAvatarProps) {
  const rank = tier ? getRankFromLp(lp) : getRankFromLp(lp);

  const sizes = {
    sm: {
      container: "h-8 w-8",
      text: "text-xs",
      ring: "ring-[1.5px] ring-offset-1",
      status: "h-2.5 w-2.5 border-[1.5px]",
    },
    md: {
      container: "h-10 w-10",
      text: "text-sm",
      ring: "ring-2 ring-offset-2",
      status: "h-3 w-3 border-2",
    },
    lg: {
      container: "h-14 w-14",
      text: "text-lg",
      ring: "ring-[2.5px] ring-offset-2",
      status: "h-3.5 w-3.5 border-2",
    },
  };

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-muted-foreground",
    "in-game": "bg-orange-500",
    away: "bg-yellow-500",
  };

  const s = sizes[size];

  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          "ring-offset-background transition-all duration-200",
          rank.bgColor,
          rank.ringColor,
          s.container,
          s.ring,
          className,
        )}
      >
        <span className={cn("font-bold", s.text, rank.color)}>{initials}</span>
      </div>
      {showStatus && (
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-background",
            statusColors[status],
            s.status,
          )}
        />
      )}
    </div>
  );
}

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak < 2) return null;

  const isHot = streak >= 5;
  const isOnFire = streak >= 10;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        "border transition-all duration-200",
        isOnFire
          ? "bg-red-500/10 border-red-500/30 text-red-500"
          : isHot
            ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
            : "bg-green-500/10 border-green-500/30 text-green-500",
        className,
      )}
    >
      <Flame className={cn("h-3.5 w-3.5", isOnFire && "animate-pulse")} />
      <span>{streak} Win Streak</span>
    </div>
  );
}
