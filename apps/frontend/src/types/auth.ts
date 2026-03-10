export type Session = {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
		emailVerified: boolean;
		createdAt: Date;
		updatedAt: Date;
	};
	session: {
		id: string;
		userId: string;
		token: string;
		expiresAt: Date;
		ipAddress?: string | null;
		userAgent?: string | null;
		createdAt: Date;
		updatedAt: Date;
	};
};

export type AuthError = {
	message: string;
	status?: number;
};
