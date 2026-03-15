"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Target, Zap, TrendingUp, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const stats = [
  {
    label: "Win Rate",
    value: "67%",
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    progress: 67
  },
  {
    label: "Avg WPM",
    value: "124",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    progress: 82
  },
  {
    label: "Accuracy",
    value: "96.4%",
    icon: Target,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    progress: 96
  },
  {
    label: "Win Streak",
    value: "5",
    icon: Flame,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    progress: 50
  },
]

export function QuickStats() {
  return (
    <Card className="animate-slide-up elevation-1 hover:elevation-2 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat, index) => (
          <div 
            key={stat.label} 
            className={cn(
              "group p-3 rounded-lg transition-all duration-200",
              "hover:bg-secondary/50"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md transition-transform duration-200 group-hover:scale-110",
                  stat.bgColor
                )}>
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className={cn(
                "text-sm font-semibold transition-colors",
                "text-foreground group-hover:" + stat.color.replace("text-", "text-")
              )}>
                {stat.value}
              </span>
            </div>
            <Progress 
              value={stat.progress} 
              className="h-1.5 transition-all duration-300 group-hover:h-2" 
            />
          </div>
        ))}
        
        {/* Rank Progress */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Trophy className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Diamond II</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">78/100 LP</span>
          </div>
          <div className="relative">
            <Progress value={78} className="h-2.5" />
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>Diamond II</span>
              <span className="text-primary font-medium">Diamond I</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

