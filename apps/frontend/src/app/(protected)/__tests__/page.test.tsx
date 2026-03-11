import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import Home from "../page";
import { useTypingStore } from "@/stores/use-typing-store";

const mockMutate = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => ({
		data: {
			user: { name: "Jean Dupont" },
			session: { id: "1" },
		},
	}),
	useSignOut: () => ({
		mutate: mockMutate,
	}),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	const { engine } = useTypingStore.getState();
	if (engine) engine.destroy();
});

describe("Home", () => {
	it("should display user name and typing game UI", () => {
		renderWithProviders(<Home />);

		expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
		expect(screen.getByText("Typing Game")).toBeInTheDocument();
		expect(screen.getByText("Start typing to begin...")).toBeInTheDocument();
	});

	it("should call signOut.mutate on sign out button click", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Home />);

		await user.click(screen.getByRole("button", { name: "Sign out" }));

		expect(mockMutate).toHaveBeenCalled();
	});
});
