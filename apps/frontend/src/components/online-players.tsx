"use client"

import { ChevronRight, Swords, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const onlineFriends = [
  {
    name: "ProTyper",
    status: "in-game",
    rank: "Diamond III",
    rankColor: "ring-primary",
    wpm: 145
  },
  {
    name: "FastFingers",
    status: "online",
    rank: "Platinum I",
    rankColor: "ring-cyan-400",
    wpm: 118
  },
  {
    name: "TypeNinja",
    status: "online",
    rank: "Diamond I",
    rankColor: "ring-primary",
    wpm: 156
  },
  {
    name: "SpeedDemon",
    status: "away",
    rank: "Gold II",
    rankColor: "ring-amber-500",
    wpm: 98
  },
]

const statusColors = {
  "online": "bg-green-500",
  "in-game": "bg-orange-500",
  "away": "bg-yellow-500",
}

const statusLabels = {
  "online": "Online",
  "in-game": "In Game",
  "away": "Away",
}

export function OnlinePlayers() {
  return (
    <Card className="animate-slide-up elevation-1 hover:elevation-2 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Friends Online
          </CardTitle>
          <Badge variant="secondary" className="text-xs">4 online</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {onlineFriends.map((friend, index) => (
            <div 
              key={friend.name}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg",
                "transition-all duration-200 group",
                "hover:bg-secondary/50"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with status and rank border */}
                <div className="relative">
                  <div className={cn(
                    "h-9 w-9 rounded-full bg-secondary flex items-center justify-center",
                    "ring-2 ring-offset-1 ring-offset-card",
                    "transition-transform duration-200 group-hover:scale-105",
                    friend.rankColor
                  )}>
                    <span className="text-xs font-semibold text-foreground">
                      {friend.name.slice(0, 2)}
                    </span>
                  </div>
                  <div 
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      statusColors[friend.status as keyof typeof statusColors]
                    )}
                    title={statusLabels[friend.status as keyof typeof statusLabels]}
                  />
                </div>
                
                {/* Info */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{friend.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{friend.rank}</span>
                    <span className="text-primary font-medium">{friend.wpm} WPM</span>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              {friend.status === "online" && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className={cn(
                    "h-8 px-2 opacity-0 group-hover:opacity-100",
                    "transition-all duration-200 focus-ring"
                  )}
                >
                  <Swords className="h-4 w-4 mr-1" />
                  <span className="text-xs">Challenge</span>
                </Button>
              )}
              
              {friend.status === "in-game" && (
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-500">
                  In Game
                </Badge>
              )}
              
              {friend.status === "away" && (
                <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-500">
                  Away
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          className="w-full mt-4 group focus-ring" 
          size="sm"
        >
          View All Friends
          <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

