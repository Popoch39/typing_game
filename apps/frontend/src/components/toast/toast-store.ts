import type { ToastType } from "./toast-config";

export interface GameToast {
	id: string;
	type: ToastType;
	title: string;
	description: string;
	duration?: number;
}

// Simple global toast store
export const toastListeners: ((toasts: GameToast[]) => void)[] = [];
export let toasts: GameToast[] = [];

export function showGameToast(toast: Omit<GameToast, "id">) {
	const newToast = { ...toast, id: Math.random().toString(36).slice(2) };
	toasts = [...toasts, newToast];
	toastListeners.forEach((listener) => {
		listener(toasts);
	});
}

export function dismissGameToast(id: string) {
	toasts = toasts.filter((t) => t.id !== id);
	toastListeners.forEach((listener) => {
		listener(toasts);
	});
}
