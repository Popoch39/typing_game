"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
	name: string;
	image?: string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
	ringClassName?: string;
}

const sizes = {
	sm: "h-8 w-8 text-[10px]",
	md: "h-9 w-9 text-xs",
	lg: "h-11 w-11 text-sm",
};

const imageSizes = {
	sm: 32,
	md: 36,
	lg: 44,
};

export function UserAvatar({
	name,
	image,
	size = "md",
	className,
	ringClassName,
}: UserAvatarProps) {
	const initials = name.slice(0, 2).toUpperCase();

	return (
		<div
			className={cn(
				"relative shrink-0 rounded-full",
				"ring-2 ring-offset-1 ring-offset-card",
				ringClassName ?? "ring-border",
				sizes[size],
				className,
			)}
		>
			{image ? (
				<Image
					src={image}
					alt={name}
					width={imageSizes[size]}
					height={imageSizes[size]}
					className="h-full w-full rounded-full object-cover"
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20">
					<span className="font-semibold text-primary select-none">
						{initials}
					</span>
				</div>
			)}
		</div>
	);
}
