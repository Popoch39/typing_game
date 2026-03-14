import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import ProtectedLayout from "../layout";

const mockSessionReturn = {
	data: null as unknown,
	isPending: false,
};

vi.mock("@/hooks/use-auth", () => ({
	useSession: () => mockSessionReturn,
}));

beforeEach(() => {
	mockSessionReturn.data = null;
	mockSessionReturn.isPending = false;
});

describe("ProtectedLayout", () => {
	it("should show loading when isPending", () => {
		mockSessionReturn.isPending = true;

		renderWithProviders(
			<ProtectedLayout>
				<div>Content</div>
			</ProtectedLayout>,
		);

		expect(screen.getByText("Chargement...")).toBeInTheDocument();
		expect(screen.queryByText("Content")).not.toBeInTheDocument();
	});

	it("should render null when no session", () => {
		mockSessionReturn.data = null;

		const { container } = renderWithProviders(
			<ProtectedLayout>
				<div>Content</div>
			</ProtectedLayout>,
		);

		expect(screen.queryByText("Content")).not.toBeInTheDocument();
		expect(container.innerHTML).toBe("");
	});

	it("should render children when session exists", () => {
		mockSessionReturn.data = {
			user: { name: "Test", email: "test@example.com" },
			session: { id: "1" },
		};

		renderWithProviders(
			<ProtectedLayout>
				<div>Content</div>
			</ProtectedLayout>,
		);

		expect(screen.getByText("Content")).toBeInTheDocument();
	});
});
