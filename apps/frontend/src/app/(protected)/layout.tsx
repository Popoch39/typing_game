"use client";

import { useSession } from "@/hooks/use-auth";

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">Chargement...</p>
			</div>
		);
	}

	if (!session) {
		return null;
	}

	return <>{children}</>;
}
