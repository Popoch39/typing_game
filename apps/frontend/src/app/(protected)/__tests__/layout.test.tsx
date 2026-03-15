import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import Layout from "../layout";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/",
}));

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => ({
		data: {
			user: { id: "u1", name: "TestUser", image: null },
			session: { id: "s1", token: "tok" },
		},
	}),
}));

vi.mock("@/hooks/use-rating", () => ({
	useRating: () => ({ data: null, rankInfo: null }),
	useMyMatchHistory: () => ({ data: [], isLoading: false }),
}));

const { mockStoreState } = vi.hoisted(() => {
	const mockStoreState = {
		presence: { online: 0, queuing: 0, inGame: 0 },
		status: "idle",
		roomCode: null,
		isRanked: false,
	};
	return { mockStoreState };
});

vi.mock("@/hooks/use-multiplayer", () => {
	const storeFn = Object.assign(
		(selector: (s: Record<string, unknown>) => unknown) =>
			selector(mockStoreState),
		{ getState: () => mockStoreState },
	);
	return {
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
		useMultiplayerStore: storeFn,
	};
});

vi.mock("@/stores/use-multiplayer-store", () => ({
	useMultiplayerStore: (selector: (s: Record<string, unknown>) => unknown) =>
		selector({
			presence: { online: 0, queuing: 0, inGame: 0 },
			status: "idle",
			roomCode: null,
			isRanked: false,
		}),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("ProtectedLayout", () => {
	it("should render the sidebar with app name", () => {
		renderWithProviders(
			<Layout>
				<div>Child content</div>
			</Layout>,
		);

		expect(screen.getByText("TypeDuel")).toBeInTheDocument();
	});

	it("should render children", () => {
		renderWithProviders(
			<Layout>
				<div>Child content</div>
			</Layout>,
		);

		expect(screen.getByText("Child content")).toBeInTheDocument();
	});

	it("should render navigation items", () => {
		renderWithProviders(
			<Layout>
				<div />
			</Layout>,
		);

		expect(screen.getByText("Play")).toBeInTheDocument();
		expect(screen.getByText("Leaderboard")).toBeInTheDocument();
		expect(screen.getByText("Settings")).toBeInTheDocument();
	});
});
