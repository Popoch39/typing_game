import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import RegisterPage from "../page";

const mockMutate = vi.fn();
const mockRegisterState = {
  mutate: mockMutate,
  isPending: false,
  error: null as Error | null,
};

vi.mock("@/hooks/use-auth", () => ({
  useRegister: () => mockRegisterState,
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
  mockRegisterState.isPending = false;
  mockRegisterState.error = null;
  mockRegisterState.mutate = mockMutate;
});

describe("RegisterPage", () => {
  it("should render the form with all fields", () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Confirmer le mot de passe")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "S'inscrire" })
    ).toBeInTheDocument();
    expect(screen.getByText("Se connecter")).toHaveAttribute("href", "/login");
  });

  it("should show validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: "S'inscrire" }));

    await waitFor(() => {
      expect(screen.getByText("Email invalide")).toBeInTheDocument();
    });
  });

  it("should show password mismatch error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText("Nom"), "Jean Dupont");
    await user.type(screen.getByLabelText("Email"), "jean@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "different"
    );
    await user.click(screen.getByRole("button", { name: "S'inscrire" }));

    await waitFor(() => {
      expect(
        screen.getByText("Les mots de passe ne correspondent pas")
      ).toBeInTheDocument();
    });
  });

  it("should call register.mutate with valid data", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText("Nom"), "Jean Dupont");
    await user.type(screen.getByLabelText("Email"), "jean@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "S'inscrire" }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        name: "Jean Dupont",
        email: "jean@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
    });
  });

  it("should display API error", () => {
    mockRegisterState.error = new Error("Email déjà utilisé");

    renderWithProviders(<RegisterPage />);

    expect(screen.getByText("Email déjà utilisé")).toBeInTheDocument();
  });

  it("should disable button when isPending", () => {
    mockRegisterState.isPending = true;

    renderWithProviders(<RegisterPage />);

    expect(
      screen.getByRole("button", { name: "Inscription..." })
    ).toBeDisabled();
  });
});
