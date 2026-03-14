import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import LoginPage from "../page";

const mockMutate = vi.fn();
const mockLoginState = {
	mutate: mockMutate,
	isPending: false,
	error: null as Error | null,
};

const mockDiscordMutate = vi.fn();
const mockDiscordLoginState = {
	mutate: mockDiscordMutate,
	isPending: false,
	error: null as Error | null,
};

vi.mock("@/hooks/use-auth", () => ({
	useLogin: () => mockLoginState,
	useDiscordLogin: () => mockDiscordLoginState,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

beforeEach(() => {
	vi.clearAllMocks();
	mockLoginState.isPending = false;
	mockLoginState.error = null;
	mockLoginState.mutate = mockMutate;
});

describe("LoginPage", () => {
	it("should render the form with all fields", () => {
		renderWithProviders(<LoginPage />);

		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Se connecter" }),
		).toBeInTheDocument();
		expect(screen.getByText("S'inscrire")).toHaveAttribute("href", "/register");
	});

	it("should show validation errors on empty submit", async () => {
		const user = userEvent.setup();
		renderWithProviders(<LoginPage />);

		await user.click(screen.getByRole("button", { name: "Se connecter" }));

		await waitFor(() => {
			expect(screen.getByText("Email invalide")).toBeInTheDocument();
		});
	});

	it("should call login.mutate with valid data", async () => {
		const user = userEvent.setup();
		renderWithProviders(<LoginPage />);

		await user.type(screen.getByLabelText("Email"), "test@example.com");
		await user.type(screen.getByLabelText("Mot de passe"), "password123");
		await user.click(screen.getByRole("button", { name: "Se connecter" }));

		await waitFor(() => {
			expect(mockMutate).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
			});
		});
	});

	it("should display API error", () => {
		mockLoginState.error = new Error("Identifiants invalides");

		renderWithProviders(<LoginPage />);

		expect(screen.getByText("Identifiants invalides")).toBeInTheDocument();
	});

	it("should disable button when isPending", () => {
		mockLoginState.isPending = true;

		renderWithProviders(<LoginPage />);

		expect(screen.getByRole("button", { name: "Connexion..." })).toBeDisabled();
	});
});
