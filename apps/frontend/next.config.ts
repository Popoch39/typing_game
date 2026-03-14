import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.discordapp.com",
			},
		],
	},
	transpilePackages: ["next-themes", "@repo/shared"],
	env: {
		NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002",
	},
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${process.env.API_INTERNAL_URL || "http://localhost:3001"}/api/:path*`,
			},
		];
	},
};

export default nextConfig;
