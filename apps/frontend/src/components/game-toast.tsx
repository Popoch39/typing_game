"use client"

import { 
  Flame, 
  Star, 
  Swords, 
  TrendingUp,
  Trophy, 
  X
} from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

type ToastType = "match-found" | "victory" | "defeat" | "achievement" | "rank-up" | "streak"

interface GameToast {
  id: string
  type: ToastType
  title: string
  description: string
  duration?: number
}

const toastConfig: Record<ToastType, {
  icon: React.ElementType
  iconClass: string
  bgClass: string
  borderClass: string
}> = {
  "match-found": {
    icon: Swords,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-l-primary"
  },
  "victory": {
    icon: Trophy,
    iconClass: "text-green-500",
    bgClass: "bg-green-500/10",
    borderClass: "border-l-green-500"
  },
  "defeat": {
    icon: Swords,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    borderClass: "border-l-destructive"
  },
  "achievement": {
    icon: Star,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-l-amber-500"
  },
  "rank-up": {
    icon: TrendingUp,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-l-primary"
  },
  "streak": {
    icon: Flame,
    iconClass: "text-orange-500",
    bgClass: "bg-orange-500/10",
    borderClass: "border-l-orange-500"
  }
}

function GameToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: GameToast
  onDismiss: (id: string) => void 
}) {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration || 5000)
    
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border-l-4",
      "bg-card elevation-2 animate-slide-up",
      "transition-all duration-300",
      config.borderClass
    )}>
      <div className={cn(
        "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
        config.bgClass
      )}>
        <Icon className={cn("h-5 w-5", config.iconClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 -mt-1 -mr-1"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  )
}

// Simple global toast store
let toastListeners: ((toasts: GameToast[]) => void)[] = []
let toasts: GameToast[] = []

export function showGameToast(toast: Omit<GameToast, "id">) {
  const newToast = { ...toast, id: Math.random().toString(36).slice(2) }
  toasts = [...toasts, newToast]
  toastListeners.forEach(listener => listener(toasts))
}

export function GameToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<GameToast[]>([])
  
  useEffect(() => {
    const listener = (newToasts: GameToast[]) => setCurrentToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])
  
  const dismissToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id)
    toastListeners.forEach(listener => listener(toasts))
  }
  
  if (currentToasts.length === 0) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {currentToasts.map(toast => (
        <GameToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  )
}

