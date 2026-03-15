import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import DashboardPage from "../page";

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => ({
		data: {
			user: { id: "u1", name: "TestUser", image: null },
			session: { id: "s1", token: "tok" },
		},
	}),
}));

vi.mock("@/hooks/use-multiplayer", () => ({
	useMultiplayer: () => ({
		status: "idle",
		connect: vi.fn(),
		disconnect: vi.fn(),
		joinQueue: vi.fn(),
		leaveQueue: vi.fn(),
		joinRankedQueue: vi.fn(),
		leaveRankedQueue: vi.fn(),
		createRoom: vi.fn(),
		joinRoom: vi.fn(),
	}),
	useMultiplayerStore: (selector: (s: Record<string, unknown>) => unknown) =>
		selector({
			presence: { online: 0, queuing: 0, inGame: 0 },
			status: "idle",
			roomCode: null,
			isRanked: false,
		}),
}));

vi.mock("@/stores/use-multiplayer-store", () => ({
	useMultiplayerStore: (selector: (s: Record<string, unknown>) => unknown) =>
		selector({
			presence: { online: 0, queuing: 0, inGame: 0 },
			status: "idle",
			roomCode: null,
			isRanked: false,
		}),
}));

vi.mock("@/hooks/use-rating", () => ({
	useMyMatchHistory: () => ({ data: [], isLoading: false }),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("DashboardPage", () => {
	it("should display the welcome message with user name", () => {
		renderWithProviders(<DashboardPage />);

		expect(screen.getByText("TestUser")).toBeInTheDocument();
		expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
	});

	it("should render game mode cards", () => {
		renderWithProviders(<DashboardPage />);

		expect(screen.getByText("Quick Match")).toBeInTheDocument();
		expect(screen.getByText("Ranked Match")).toBeInTheDocument();
		expect(screen.getByText("Custom Game")).toBeInTheDocument();
	});

	it("should render recent matches section", () => {
		renderWithProviders(<DashboardPage />);

		expect(screen.getByText("Recent Matches")).toBeInTheDocument();
	});
});
