"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@/hooks/use-auth";
import { registerSchema, type RegisterInput } from "@/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterInput>({
		resolver: zodResolver(registerSchema),
	});

	const signup = useRegister();

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Inscription</CardTitle>
					<CardDescription>
						Créez votre compte pour commencer
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit((data) => signup.mutate(data))}>
					<CardContent className="space-y-4">
						{signup.error && (
							<p className="text-sm text-destructive">
								{signup.error.message}
							</p>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Nom</Label>
							<Input
								id="name"
								type="text"
								placeholder="Jean Dupont"
								{...register("name")}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">
									{errors.name.message}
								</p>
							)}
						</div>
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
							<Input
								id="password"
								type="password"
								{...register("password")}
							/>
							{errors.password && (
								<p className="text-sm text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">
								Confirmer le mot de passe
							</Label>
							<Input
								id="confirmPassword"
								type="password"
								{...register("confirmPassword")}
							/>
							{errors.confirmPassword && (
								<p className="text-sm text-destructive">
									{errors.confirmPassword.message}
								</p>
							)}
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button
							type="submit"
							className="w-full"
							disabled={signup.isPending}
						>
							{signup.isPending ? "Inscription..." : "S'inscrire"}
						</Button>
						<p className="text-sm text-muted-foreground">
							Déjà un compte ?{" "}
							<Link href="/login" className="text-primary underline">
								Se connecter
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
