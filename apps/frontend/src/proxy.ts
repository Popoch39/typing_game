import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;

	// Logged in users shouldn't access auth pages
	if (sessionCookie && ["/login", "/register"].includes(pathname)) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	console.log("laaa", sessionCookie);

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
		 * - /api (proxy routes)
		 * - /_next (Next.js internals)
		 * - Static files
		 */
		"/((?!login|register|api|_next|favicon.ico|.*\\.).*)",
	],
};
