import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMultiplayerStore } from "@/stores/use-multiplayer-store";
import { renderWithProviders } from "@/test/test-utils";
import { PlaySection } from "../play-section";

// ── Mocks ──

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => ({
		data: {
			user: { id: "u1", name: "TestUser" },
			session: { id: "s1", token: "tok" },
		},
	}),
}));

const defaultProps = {
	onQuickPlay: vi.fn(),
	onRankedPlay: vi.fn(),
	onCreateRoom: vi.fn(),
	onJoinRoom: vi.fn(),
	onCancel: vi.fn(),
};

function resetStore(overrides: Record<string, unknown> = {}) {
	useMultiplayerStore.setState({
		status: "idle",
		roomCode: null,
		isRanked: false,
		presence: { online: 3, queuing: 1, inGame: 2 },
		...overrides,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	resetStore();
});

// ── Tests ──

describe("PlaySection", () => {
	// -- Rendering --

	it("renders all three game mode cards", () => {
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("Quick Match")).toBeInTheDocument();
		expect(screen.getByText("Ranked Match")).toBeInTheDocument();
		expect(screen.getByText("Custom Game")).toBeInTheDocument();
	});

	it("shows real player count from presence", () => {
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("6 players online")).toBeInTheDocument();
	});

	it("shows features on idle cards", () => {
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("No rank change")).toBeInTheDocument();
		expect(screen.getByText("Rank points")).toBeInTheDocument();
		expect(screen.getByText("Private rooms")).toBeInTheDocument();
	});

	// -- Play actions --

	it("calls onQuickPlay when clicking Quick Match play button", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		const buttons = screen.getAllByText("Play Now");
		await user.click(buttons[0]);

		expect(defaultProps.onQuickPlay).toHaveBeenCalledOnce();
	});

	it("calls onRankedPlay when clicking Ranked Match play button", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		const buttons = screen.getAllByText("Play Now");
		await user.click(buttons[1]);

		expect(defaultProps.onRankedPlay).toHaveBeenCalledOnce();
	});

	it("calls onCreateRoom when clicking Create Room button", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		await user.click(screen.getByText("Create Room"));

		expect(defaultProps.onCreateRoom).toHaveBeenCalledOnce();
	});

	// -- Searching state (quick) --

	it("shows searching state on quick card when queuing casual", () => {
		resetStore({ status: "queuing", isRanked: false });
		renderWithProviders(<PlaySection {...defaultProps} />);

		// Quick card should show Cancel button
		expect(screen.getByText("Cancel")).toBeInTheDocument();
		// Other play buttons should be disabled
		const playButtons = screen.queryAllByText("Play Now");
		for (const btn of playButtons) {
			expect(btn.closest("button")).toBeDisabled();
		}
	});

	it("shows searching state on ranked card when queuing ranked", () => {
		resetStore({ status: "queuing", isRanked: true });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("calls onCancel when clicking Cancel during search", async () => {
		const user = userEvent.setup();
		resetStore({ status: "queuing", isRanked: false });
		renderWithProviders(<PlaySection {...defaultProps} />);

		await user.click(screen.getByText("Cancel"));

		expect(defaultProps.onCancel).toHaveBeenCalledOnce();
	});

	// -- Waiting room state (custom) --

	it("shows room code when waiting in custom room", () => {
		resetStore({ status: "in_room", roomCode: "ABC123" });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("ABC123")).toBeInTheDocument();
		expect(screen.getByText("Room Code")).toBeInTheDocument();
	});

	it("shows Cancel button when in room", () => {
		resetStore({ status: "in_room", roomCode: "XYZ" });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	// -- Join room --

	it("shows join room input on custom card when idle", () => {
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByPlaceholderText("Room code")).toBeInTheDocument();
	});

	it("calls onJoinRoom when submitting a code", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		const input = screen.getByPlaceholderText("Room code");
		await user.type(input, "ABCD");
		await user.keyboard("{Enter}");

		expect(defaultProps.onJoinRoom).toHaveBeenCalledWith("ABCD");
	});

	it("does not call onJoinRoom with short code", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		const input = screen.getByPlaceholderText("Room code");
		await user.type(input, "AB");
		await user.keyboard("{Enter}");

		expect(defaultProps.onJoinRoom).not.toHaveBeenCalled();
	});

	it("converts room code input to uppercase", async () => {
		const user = userEvent.setup();
		renderWithProviders(<PlaySection {...defaultProps} />);

		const input = screen.getByPlaceholderText("Room code");
		await user.type(input, "abcd");
		await user.keyboard("{Enter}");

		expect(defaultProps.onJoinRoom).toHaveBeenCalledWith("ABCD");
	});

	// -- Disabled states --

	it("disables play buttons when already searching", () => {
		resetStore({ status: "queuing", isRanked: false });
		renderWithProviders(<PlaySection {...defaultProps} />);

		// No Play Now or Create Room buttons should be visible (replaced by Cancel on active card, disabled on others)
		const playButtons = screen.queryAllByText("Play Now");
		for (const btn of playButtons) {
			expect(btn.closest("button")).toBeDisabled();
		}
	});

	it("hides join room input when busy", () => {
		resetStore({ status: "queuing", isRanked: false });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.queryByPlaceholderText("Room code")).not.toBeInTheDocument();
	});

	// -- Player count updates --

	it("updates player count when presence changes", () => {
		resetStore({ presence: { online: 10, queuing: 5, inGame: 3 } });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("18 players online")).toBeInTheDocument();
	});

	it("shows 0 players online when no presence", () => {
		resetStore({ presence: { online: 0, queuing: 0, inGame: 0 } });
		renderWithProviders(<PlaySection {...defaultProps} />);

		expect(screen.getByText("0 players online")).toBeInTheDocument();
	});
});
