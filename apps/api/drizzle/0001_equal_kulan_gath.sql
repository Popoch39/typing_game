CREATE TABLE "match_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" text NOT NULL,
	"player1_id" uuid NOT NULL,
	"player2_id" uuid NOT NULL,
	"winner_id" uuid,
	"player1_score" integer NOT NULL,
	"player2_score" integer NOT NULL,
	"player1_wpm" integer NOT NULL,
	"player2_wpm" integer NOT NULL,
	"player1_accuracy" real NOT NULL,
	"player2_accuracy" real NOT NULL,
	"player1_rating_before" real,
	"player1_rating_after" real,
	"player1_rd_before" real,
	"player1_rd_after" real,
	"player2_rating_before" real,
	"player2_rating_after" real,
	"player2_rd_before" real,
	"player2_rd_after" real,
	"mode" text NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_results_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "player_ratings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"rating" real DEFAULT 1500 NOT NULL,
	"rd" real DEFAULT 350 NOT NULL,
	"volatility" real DEFAULT 0.06 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"last_game_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_player1_id_users_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_player2_id_users_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;