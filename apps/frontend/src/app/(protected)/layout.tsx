"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { useSession } from "@/hooks/use-auth";
import { useMultiplayer, useMultiplayerStore } from "@/hooks/use-multiplayer";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";

const GAME_DURATION = 15;

function Shell({ children }: { children: ReactNode }) {
	const { isCollapsed } = useSidebar();
	const { data: session } = useSession();
	const router = useRouter();
	const mp = useMultiplayer();
	const connectedRef = useRef(false);

	const sessionToken = session?.session?.token;

	// Connect WS when session is available
	// biome-ignore lint/correctness/useExhaustiveDependencies: mp methods are stable refs
	useEffect(() => {
		if (!sessionToken || connectedRef.current) return;
		mp.connect(sessionToken);
		connectedRef.current = true;

		return () => {
			const currentStatus = useMultiplayerStore.getState().status;
			if (currentStatus === "idle" || currentStatus === "connecting") {
				mp.disconnect();
				connectedRef.current = false;
			}
		};
	}, [sessionToken]);

	// Auto-navigate to /multiplayer when countdown starts
	const mpStatus = useMultiplayerStore((s) => s.status);
	useEffect(() => {
		if (mpStatus === "countdown" || mpStatus === "playing") {
			router.push("/multiplayer");
		}
	}, [mpStatus, router]);

	return (
		<main
			className={cn(
				"transition-all duration-300 ease-in-out",
				"max-lg:pl-0 max-lg:pt-16",
				isCollapsed ? "lg:pl-[72px]" : "lg:pl-64",
			)}
		>
			<div className="p-4 md:p-6">{children}</div>
		</main>
	);
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
	return (
		<SidebarProvider>
			<div className="min-h-screen bg-background">
				<Sidebar />
				<Shell>{children}</Shell>
			</div>
		</SidebarProvider>
	);
}
