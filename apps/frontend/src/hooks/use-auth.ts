"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { LoginInput, RegisterInput } from "@/validators/auth";

export function useSession() {
	return authClient.useSession();
}

export function useLogin() {
	const router = useRouter();

	return useMutation({
		mutationFn: async (data: LoginInput) => {
			const result = await authClient.signIn.email({
				email: data.email,
				password: data.password,
			});
			if (result.error) {
				throw new Error(result.error.message);
			}
			return result.data;
		},
		onSuccess: () => {
			router.push("/");
		},
	});
}

export function useRegister() {
	const router = useRouter();

	return useMutation({
		mutationFn: async (data: RegisterInput) => {
			const result = await authClient.signUp.email({
				name: data.name,
				email: data.email,
				password: data.password,
			});
			if (result.error) {
				throw new Error(result.error.message);
			}
			return result.data;
		},
		onSuccess: () => {
			router.push("/");
		},
	});
}

export function useDiscordLogin() {
	return useMutation({
		mutationFn: async () => {
			await authClient.signIn.social({
				provider: "discord",
				callbackURL: "/",
			});
		},
	});
}

export function useSignOut() {
	const router = useRouter();

	return useMutation({
		mutationFn: async () => {
			await authClient.signOut();
		},
		onSuccess: () => {
			router.push("/login");
		},
	});
}
