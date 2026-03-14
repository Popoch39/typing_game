"use client";

import { useSession, useSignOut } from "@/hooks/use-auth";
import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";
import { TypingArea } from "@/components/typing/typing-area";
import { ComboDisplay } from "@/components/typing/combo-display";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { OpponentProgress } from "@/components/multiplayer/opponent-progress";
import { LobbyScreen } from "@/components/multiplayer/lobby-screen";
import { WaitingScreen } from "@/components/multiplayer/waiting-screen";
import { CountdownScreen } from "@/components/multiplayer/countdown-screen";
import { GameResultScreen } from "@/components/multiplayer/game-result-screen";
import Link from "next/link";

export default function MultiplayerPage() {
  const { data: session } = useSession();
  const signOut = useSignOut();
  const { mp, typingStore, handlePlayAgain, handleCancel } =
    useMultiplayerGame();

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1 className="text-xl font-bold tracking-tight hover:text-primary transition-colors">
              Typing Game
            </h1>
          </Link>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            1v1
          </span>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => signOut.mutate()}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        {mp.error && (
          <div className="w-full max-w-md rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {mp.error}
          </div>
        )}

        {mp.opponentDisconnected && mp.status === "playing" && (
          <div className="w-full max-w-md rounded-lg bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
            Opponent disconnected — waiting 5s...
          </div>
        )}

        {(mp.status === "idle" || mp.status === "connecting") && (
          <LobbyScreen
            onJoinQueue={mp.joinQueue}
            onCreateRoom={mp.createRoom}
            onJoinRoom={mp.joinRoom}
          />
        )}

        {(mp.status === "queuing" || mp.status === "in_room") && (
          <WaitingScreen onCancel={handleCancel} />
        )}

        {mp.status === "countdown" && <CountdownScreen />}

        {mp.status === "playing" && (
          <div className="w-full space-y-6">
            <OpponentProgress />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 font-mono text-2xl text-muted-foreground">
                <span className="tabular-nums text-primary">
                  {typingStore.isRunning
                    ? typingStore.timeRemaining
                    : mp.gameDuration}
                </span>
                {typingStore.isRunning && (
                  <>
                    <span className="tabular-nums">{typingStore.wpm} wpm</span>
                    <span className="tabular-nums">
                      {typingStore.accuracy}%
                    </span>
                    <span className="tabular-nums">{typingStore.score}</span>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <ComboDisplay />
              <TypingArea />
            </div>
            {!typingStore.isRunning && (
              <p className="text-center text-sm text-muted-foreground">
                Start typing to begin...
              </p>
            )}
            {process.env.NODE_ENV !== "production" && mp.selfStats && (
              <div className="rounded-md border border-dashed border-yellow-500/50 bg-yellow-500/5 px-3 py-2 font-mono text-xs text-yellow-600 dark:text-yellow-400">
                <span className="font-semibold">DEBUG</span>
                {" | "}
                time correction: <span className={mp.selfStats.timeCorrection !== 0 ? "text-red-500 font-bold" : ""}>{mp.selfStats.timeCorrection}ms</span>
              </div>
            )}
          </div>
        )}

        {mp.status === "finished" && (
          <GameResultScreen onPlayAgain={handlePlayAgain} />
        )}
      </main>
    </div>
  );
}
