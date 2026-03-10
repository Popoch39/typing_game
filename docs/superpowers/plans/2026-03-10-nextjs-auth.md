# Next.js Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auth (login/register pages, middleware redirect, proxy) to the Next.js frontend using Better Auth client, shadcn/ui, React Hook Form, Zod, and TanStack Query.

**Architecture:** Next.js rewrites proxy `/api/auth/*` to the Elysia backend (port 3001). A `middleware.ts` uses `getSessionCookie` from `better-auth/cookies` for optimistic redirect. Pages use `createAuthClient` from `better-auth/react` with `useSession`, `signIn.email`, `signUp.email`. Forms use React Hook Form + Zod + TanStack Query mutations.

**Tech Stack:** Next.js 16, Better Auth client, shadcn/ui, React Hook Form, @hookform/resolvers, Zod, TanStack React Query, Tailwind v4

---

## File Structure

```
apps/frontend/src/
├── app/
│   ├── layout.tsx              (modify — add QueryClientProvider)
│   ├── (auth)/
│   │   ├── login/page.tsx      (create — login form)
│   │   └── register/page.tsx   (create — register form)
│   ├── (protected)/
│   │   ├── layout.tsx          (create — session guard wrapper)
│   │   └── page.tsx            (modify — move here, replace boilerplate)
│   └── globals.css             (modify — shadcn will update)
├── lib/
│   ├── auth-client.ts          (create — Better Auth client)
│   ├── query-client.ts         (create — TanStack Query client)
│   └── validators.ts           (create — Zod schemas)
├── components/
│   └── ui/                     (create — shadcn components auto-generated)
├── providers/
│   └── query-provider.tsx      (create — QueryClientProvider wrapper)
├── middleware.ts                (create — auth redirect middleware)
next.config.ts                  (modify — add rewrites proxy)
```

---

## Chunk 1: Setup & Infrastructure

### Task 1: Install dependencies

**Files:**
- Modify: `apps/frontend/package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd apps/frontend && bun add better-auth @tanstack/react-query react-hook-form @hookform/resolvers zod
```

- [ ] **Step 2: Init shadcn**

```bash
cd apps/frontend && bunx shadcn@latest init -d
```

Accept defaults. This creates `components.json`, `lib/utils.ts`, updates `globals.css`.

- [ ] **Step 3: Add shadcn components**

```bash
cd apps/frontend && bunx shadcn@latest add button input label card form
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/
git commit -m "feat(frontend): install auth, form, and shadcn dependencies"
```

---

### Task 2: Configure proxy rewrites in next.config.ts

**Files:**
- Modify: `apps/frontend/next.config.ts`

- [ ] **Step 1: Add rewrites**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/:path*`,
			},
		];
	},
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/next.config.ts
git commit -m "feat(frontend): add API proxy rewrites"
```

---

### Task 3: Create Better Auth client

**Files:**
- Create: `apps/frontend/src/lib/auth-client.ts`

- [ ] **Step 1: Create auth client**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: typeof window !== "undefined" ? window.location.origin : "",
});
```

No `baseURL` pointing to backend needed — the proxy handles it. The client calls `/api/auth/*` which Next.js rewrites to the backend.

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/lib/auth-client.ts
git commit -m "feat(frontend): create Better Auth client"
```

---

### Task 4: Create TanStack Query provider

**Files:**
- Create: `apps/frontend/src/lib/query-client.ts`
- Create: `apps/frontend/src/providers/query-provider.tsx`
- Modify: `apps/frontend/src/app/layout.tsx`

- [ ] **Step 1: Create query client**

```ts
// apps/frontend/src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});
```

- [ ] **Step 2: Create provider wrapper**

```tsx
// apps/frontend/src/providers/query-provider.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
}
```

- [ ] **Step 3: Wrap layout with provider**

In `apps/frontend/src/app/layout.tsx`, wrap `{children}` with `<QueryProvider>`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Typing Game",
	description: "Test your typing speed",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/lib/query-client.ts apps/frontend/src/providers/query-provider.tsx apps/frontend/src/app/layout.tsx
git commit -m "feat(frontend): add TanStack Query provider"
```

---

### Task 5: Create middleware

**Files:**
- Create: `apps/frontend/src/middleware.ts`

- [ ] **Step 1: Create middleware with optimistic cookie check**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;

	// Logged in users shouldn't access auth pages
	if (sessionCookie && ["/login", "/register"].includes(pathname)) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	// Not logged in users get redirected to login
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all paths except:
		 * - /login, /register (auth pages)
		 * - /api (proxy)
		 * - /_next (Next.js internals)
		 * - Static files
		 */
		"/((?!login|register|api|_next|favicon.ico|.*\\.).*)",
	],
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/middleware.ts
git commit -m "feat(frontend): add auth middleware with session cookie check"
```

---

## Chunk 2: Auth Pages

### Task 6: Create Zod validators

**Files:**
- Create: `apps/frontend/src/lib/validators.ts`

- [ ] **Step 1: Create validation schemas**

```ts
import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().email("Email invalide"),
	password: z.string().min(8, "8 caractères minimum"),
});

export const registerSchema = z
	.object({
		name: z.string().min(2, "2 caractères minimum"),
		email: z.string().email("Email invalide"),
		password: z.string().min(8, "8 caractères minimum"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/lib/validators.ts
git commit -m "feat(frontend): add Zod validation schemas for auth forms"
```

---

### Task 7: Create login page

**Files:**
- Create: `apps/frontend/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create login page with form**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validators";
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

export default function LoginPage() {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
	});

	const loginMutation = useMutation({
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

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Connexion</CardTitle>
					<CardDescription>
						Connectez-vous à votre compte
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit((data) => loginMutation.mutate(data))}>
					<CardContent className="space-y-4">
						{loginMutation.error && (
							<p className="text-sm text-destructive">
								{loginMutation.error.message}
							</p>
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
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button
							type="submit"
							className="w-full"
							disabled={loginMutation.isPending}
						>
							{loginMutation.isPending ? "Connexion..." : "Se connecter"}
						</Button>
						<p className="text-sm text-muted-foreground">
							Pas encore de compte ?{" "}
							<Link href="/register" className="text-primary underline">
								S'inscrire
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/\(auth\)/login/page.tsx
git commit -m "feat(frontend): add login page"
```

---

### Task 8: Create register page

**Files:**
- Create: `apps/frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create register page with form**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validators";
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
	const router = useRouter();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterInput>({
		resolver: zodResolver(registerSchema),
	});

	const registerMutation = useMutation({
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

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Inscription</CardTitle>
					<CardDescription>
						Créez votre compte pour commencer
					</CardDescription>
				</CardHeader>
				<form
					onSubmit={handleSubmit((data) => registerMutation.mutate(data))}
				>
					<CardContent className="space-y-4">
						{registerMutation.error && (
							<p className="text-sm text-destructive">
								{registerMutation.error.message}
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
							disabled={registerMutation.isPending}
						>
							{registerMutation.isPending
								? "Inscription..."
								: "S'inscrire"}
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/\(auth\)/register/page.tsx
git commit -m "feat(frontend): add register page"
```

---

### Task 9: Create protected layout and update home page

**Files:**
- Create: `apps/frontend/src/app/(protected)/layout.tsx`
- Move+Modify: `apps/frontend/src/app/page.tsx` → `apps/frontend/src/app/(protected)/page.tsx`

- [ ] **Step 1: Create protected layout with session guard**

```tsx
// apps/frontend/src/app/(protected)/layout.tsx
"use client";

import { authClient } from "@/lib/auth-client";

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">Chargement...</p>
			</div>
		);
	}

	if (!session) {
		return null; // middleware handles redirect
	}

	return <>{children}</>;
}
```

- [ ] **Step 2: Create protected home page**

```tsx
// apps/frontend/src/app/(protected)/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Home() {
	const router = useRouter();
	const { data: session } = authClient.useSession();

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6">
			<h1 className="text-3xl font-bold">Typing Game</h1>
			{session && (
				<p className="text-muted-foreground">
					Bienvenue, {session.user.name}
				</p>
			)}
			<Button variant="outline" onClick={handleSignOut}>
				Se déconnecter
			</Button>
		</div>
	);
}
```

- [ ] **Step 3: Delete old page.tsx**

```bash
rm apps/frontend/src/app/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/
git commit -m "feat(frontend): add protected layout and home page with sign out"
```
