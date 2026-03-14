"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { DiscordIcon } from "@/components/icons/discord";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDiscordLogin, useLogin } from "@/hooks/use-auth";
import { type LoginInput, loginSchema } from "@/validators/auth";

export default function LoginPage() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
	});

	const login = useLogin();
	const discordLogin = useDiscordLogin();

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Connexion</CardTitle>
					<CardDescription>Connectez-vous à votre compte</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit((data) => login.mutate(data))}>
					<CardContent className="space-y-4">
						{login.error && (
							<p className="text-sm text-destructive">{login.error.message}</p>
						)}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="email@exemple.com"
								{...register("email")}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Mot de passe</Label>
							<Input id="password" type="password" {...register("password")} />
							{errors.password && (
								<p className="text-sm text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button type="submit" className="w-full" disabled={login.isPending}>
							{login.isPending ? "Connexion..." : "Se connecter"}
						</Button>
						<div className="flex w-full items-center gap-4">
							<div className="h-px flex-1 bg-border" />
							<span className="text-sm text-muted-foreground">ou</span>
							<div className="h-px flex-1 bg-border" />
						</div>
						<Button
							type="button"
							variant="outline"
							className="w-full"
							disabled={discordLogin.isPending}
							onClick={() => discordLogin.mutate()}
						>
							<DiscordIcon className="mr-2 h-5 w-5" />
							{discordLogin.isPending
								? "Redirection..."
								: "Connexion avec Discord"}
						</Button>
						{discordLogin.error && (
							<p className="text-sm text-destructive">
								{discordLogin.error.message}
							</p>
						)}
						<p className="text-sm text-muted-foreground">
							Pas encore de compte ?{" "}
							<Link href="/register" className="text-primary underline">
								S&apos;inscrire
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
