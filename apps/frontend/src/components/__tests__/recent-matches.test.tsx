import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchResult } from "@/hooks/use-rating";
import { renderWithProviders } from "@/test/test-utils";
import { RecentMatches } from "../recent-matches";

// ── Mocks ──

const MY_ID = "user-me-123";

vi.mock("next/image", () => ({
	default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
		// biome-ignore lint/a11y/useAltText: alt is passed via spread props
		<img {...props} />
	),
}));

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => ({
		data: {
			user: {
				id: MY_ID,
				name: "TestUser",
				image: "https://cdn.discordapp.com/avatar.png",
			},
			session: { id: "sess-1", token: "tok" },
		},
	}),
}));

let mockMatches: MatchResult[] | undefined;
let mockIsLoading = false;

vi.mock("@/hooks/use-rating", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/hooks/use-rating")>();
	return {
		...actual,
		useMyMatchHistory: () => ({
			data: mockMatches,
			isLoading: mockIsLoading,
		}),
	};
});

// ── Helpers ──

function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
	return {
		id: "match-1",
		roomId: "room-1",
		player1Id: MY_ID,
		player2Id: "opp-456",
		winnerId: MY_ID,
		player1Score: 1500,
		player2Score: 1200,
		player1Wpm: 120,
		player2Wpm: 100,
		player1Accuracy: 97.5,
		player2Accuracy: 93.2,
		player1RatingBefore: 1500,
		player1RatingAfter: 1524,
		player2RatingBefore: 1480,
		player2RatingAfter: 1456,
		mode: "ranked",
		duration: 60,
		createdAt: new Date().toISOString(),
		player1Name: "TestUser",
		player2Name: "Opponent",
		...overrides,
	};
}

beforeEach(() => {
	mockMatches = undefined;
	mockIsLoading = false;
});

// ── Tests ──

describe("RecentMatches", () => {
	// -- Loading state --

	it("renders skeleton loaders while loading", () => {
		mockIsLoading = true;
		const { container } = renderWithProviders(<RecentMatches />);

		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThanOrEqual(6);
	});

	// -- Empty state --

	it("renders empty state when no matches", () => {
		mockMatches = [];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("No matches yet")).toBeInTheDocument();
		expect(
			screen.getByText("Start a game to see your history here"),
		).toBeInTheDocument();
	});

	it("renders empty state when matches is undefined (not loading)", () => {
		mockMatches = undefined;
		mockIsLoading = false;
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("No matches yet")).toBeInTheDocument();
	});

	// -- Header --

	it("renders the title and 'View all' link", () => {
		mockMatches = [];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("Recent Matches")).toBeInTheDocument();
		const viewAll = screen.getByText("View all");
		expect(viewAll.closest("a")).toHaveAttribute("href", "/history");
	});

	// -- Match display: current user is player1 and won --

	it("displays a won match with correct scores", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("1500")).toBeInTheDocument();
		expect(screen.getByText("1200")).toBeInTheDocument();
	});

	it("shows positive LP change for a won ranked match", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText(/\+24 LP/)).toBeInTheDocument();
	});

	it("displays user name and opponent name", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("TestUser")).toBeInTheDocument();
		expect(screen.getByText("Opponent")).toBeInTheDocument();
	});

	it("shows 'ME' badge on the current user avatar", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("ME")).toBeInTheDocument();
	});

	it("renders the user avatar with Discord image", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		const img = screen.getByAltText("TestUser");
		expect(img).toHaveAttribute("src", "https://cdn.discordapp.com/avatar.png");
	});

	it("renders opponent avatar with initials (no image)", () => {
		mockMatches = [makeMatch()];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("OP")).toBeInTheDocument();
	});

	// -- Match display: current user is player2 and lost --

	it("displays a lost match with correct perspective", () => {
		mockMatches = [
			makeMatch({
				id: "match-loss",
				player1Id: "opp-456",
				player2Id: MY_ID,
				winnerId: "opp-456",
				player1Score: 1800,
				player2Score: 1300,
				player1Wpm: 130,
				player2Wpm: 110,
				player1RatingBefore: 1480,
				player1RatingAfter: 1504,
				player2RatingBefore: 1500,
				player2RatingAfter: 1476,
				player1Name: "Opponent",
				player2Name: "TestUser",
			}),
		];
		renderWithProviders(<RecentMatches />);

		// Your score (player2) should appear first (left)
		const scores = screen.getAllByText(/^(1300|1800)$/);
		expect(scores).toHaveLength(2);

		// Negative LP
		expect(screen.getByText(/-24 LP/)).toBeInTheDocument();
	});

	// -- Draw --

	it("handles a draw match (winnerId is null)", () => {
		mockMatches = [
			makeMatch({
				id: "match-draw",
				winnerId: null,
				player1Score: 1400,
				player2Score: 1400,
				player1RatingBefore: 1500,
				player1RatingAfter: 1500,
			}),
		];
		renderWithProviders(<RecentMatches />);

		const scores = screen.getAllByText("1400");
		expect(scores).toHaveLength(2);
	});

	// -- Casual match (no LP) --

	it("does not show LP for casual matches (null ratings)", () => {
		mockMatches = [
			makeMatch({
				id: "match-casual",
				mode: "casual",
				player1RatingBefore: null,
				player1RatingAfter: null,
				player2RatingBefore: null,
				player2RatingAfter: null,
			}),
		];
		renderWithProviders(<RecentMatches />);

		expect(screen.queryByText(/LP/)).not.toBeInTheDocument();
		expect(screen.getByText("Casual")).toBeInTheDocument();
	});

	it("shows 'Ranked' label for ranked matches", () => {
		mockMatches = [makeMatch({ mode: "ranked" })];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("Ranked")).toBeInTheDocument();
	});

	// -- Max 5 matches --

	it("displays at most 5 matches", () => {
		mockMatches = Array.from({ length: 8 }, (_, i) =>
			makeMatch({
				id: `match-${i}`,
				player2Name: `Opp${i}`,
			}),
		);
		renderWithProviders(<RecentMatches />);

		const meLabels = screen.getAllByText("ME");
		expect(meLabels).toHaveLength(5);
	});

	// -- Time ago --

	it("shows relative time for recent match", () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
		mockMatches = [makeMatch({ createdAt: fiveMinAgo })];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("5m ago")).toBeInTheDocument();
	});

	it("shows 'just now' for very recent match", () => {
		mockMatches = [makeMatch({ createdAt: new Date().toISOString() })];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("just now")).toBeInTheDocument();
	});

	it("shows hours for older match", () => {
		const threeHoursAgo = new Date(
			Date.now() - 3 * 60 * 60 * 1000,
		).toISOString();
		mockMatches = [makeMatch({ createdAt: threeHoursAgo })];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("3h ago")).toBeInTheDocument();
	});

	it("shows days for very old match", () => {
		const twoDaysAgo = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000,
		).toISOString();
		mockMatches = [makeMatch({ createdAt: twoDaysAgo })];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("2d ago")).toBeInTheDocument();
	});

	// -- LP edge cases --

	it("shows 0 LP change without + sign when rating unchanged", () => {
		mockMatches = [
			makeMatch({
				id: "match-zero-lp",
				player1RatingBefore: 1500,
				player1RatingAfter: 1500,
			}),
		];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText(/^0 LP$/)).toBeInTheDocument();
	});

	// -- Multiple matches ordering --

	it("renders multiple matches in order", () => {
		mockMatches = [
			makeMatch({ id: "m1", player2Name: "Alice", player2Score: 1000 }),
			makeMatch({ id: "m2", player2Name: "Bob", player2Score: 900 }),
			makeMatch({ id: "m3", player2Name: "Charlie", player2Score: 800 }),
		];
		renderWithProviders(<RecentMatches />);

		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
		expect(screen.getByText("Charlie")).toBeInTheDocument();
	});
});
