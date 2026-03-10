"use client";

import { useSession, useSignOut } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function Home() {
	const { data: session } = useSession();
	const signOut = useSignOut();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6">
			<h1 className="text-3xl font-bold">Typing Game</h1>
			{session && (
				<p className="text-muted-foreground">
					Bienvenue, {session.user.name}
				</p>
			)}
			<Button variant="outline" onClick={() => signOut.mutate()}>
				Se déconnecter
			</Button>
		</div>
	);
}
