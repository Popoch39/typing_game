import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import Home from "../page";

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

describe("Home", () => {
  it("should display welcome message with user name", () => {
    renderWithProviders(<Home />);

    expect(screen.getByText("Bienvenue, Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Typing Game")).toBeInTheDocument();
  });

  it("should call signOut.mutate on disconnect button click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Home />);

    await user.click(
      screen.getByRole("button", { name: "Se déconnecter" })
    );

    expect(mockMutate).toHaveBeenCalled();
  });
});
