import {
	pgTable,
	uuid,
	text,
	boolean,
	timestamp,
	integer,
	real,
} from "drizzle-orm/pg-core";

// ── Better Auth tables ──

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
	id: uuid("id").defaultRandom().primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Game tables ──

export const gameScores = pgTable("game_scores", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	wpm: integer("wpm").notNull(),
	accuracy: real("accuracy").notNull(),
	duration: integer("duration").notNull(),
	mode: text("mode").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Rating & Match tables ──

export const playerRatings = pgTable("player_ratings", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	rating: real("rating").notNull().default(1500),
	rd: real("rd").notNull().default(350),
	volatility: real("volatility").notNull().default(0.06),
	gamesPlayed: integer("games_played").notNull().default(0),
	lastGameAt: timestamp("last_game_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchResults = pgTable("match_results", {
	id: uuid("id").defaultRandom().primaryKey(),
	roomId: text("room_id").notNull().unique(),
	player1Id: uuid("player1_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	player2Id: uuid("player2_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	winnerId: uuid("winner_id"),
	player1Score: integer("player1_score").notNull(),
	player2Score: integer("player2_score").notNull(),
	player1Wpm: integer("player1_wpm").notNull(),
	player2Wpm: integer("player2_wpm").notNull(),
	player1Accuracy: real("player1_accuracy").notNull(),
	player2Accuracy: real("player2_accuracy").notNull(),
	player1RatingBefore: real("player1_rating_before"),
	player1RatingAfter: real("player1_rating_after"),
	player1RdBefore: real("player1_rd_before"),
	player1RdAfter: real("player1_rd_after"),
	player2RatingBefore: real("player2_rating_before"),
	player2RatingAfter: real("player2_rating_after"),
	player2RdBefore: real("player2_rd_before"),
	player2RdAfter: real("player2_rd_after"),
	mode: text("mode").notNull(),
	duration: integer("duration").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
