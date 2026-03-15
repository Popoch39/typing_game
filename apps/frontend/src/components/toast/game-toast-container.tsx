"use client";

import { useEffect, useState } from "react";
import { GameToastItem } from "./game-toast-item";
import type { GameToast } from "./toast-store";
import { dismissGameToast, toastListeners } from "./toast-store";

export { showGameToast } from "./toast-store";

export function GameToastContainer() {
	const [currentToasts, setCurrentToasts] = useState<GameToast[]>([]);

	useEffect(() => {
		const listener = (newToasts: GameToast[]) => setCurrentToasts(newToasts);
		toastListeners.push(listener);
		return () => {
			const idx = toastListeners.indexOf(listener);
			if (idx !== -1) toastListeners.splice(idx, 1);
		};
	}, []);

	if (currentToasts.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
			{currentToasts.map((toast) => (
				<GameToastItem
					key={toast.id}
					toast={toast}
					onDismiss={dismissGameToast}
				/>
			))}
		</div>
	);
}
