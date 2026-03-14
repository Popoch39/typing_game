import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../auth";

describe("loginSchema", () => {
	it("should validate correct data", () => {
		const result = loginSchema.safeParse({
			email: "test@example.com",
			password: "password123",
		});
		expect(result.success).toBe(true);
	});

	it("should reject invalid email", () => {
		const result = loginSchema.safeParse({
			email: "not-an-email",
			password: "password123",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailError = result.error.issues.find((i) =>
				i.path.includes("email"),
			);
			expect(emailError?.message).toBe("Email invalide");
		}
	});

	it("should reject password shorter than 8 characters", () => {
		const result = loginSchema.safeParse({
			email: "test@example.com",
			password: "short",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const pwError = result.error.issues.find((i) =>
				i.path.includes("password"),
			);
			expect(pwError?.message).toBe("8 caractères minimum");
		}
	});
});

describe("registerSchema", () => {
	it("should validate correct data", () => {
		const result = registerSchema.safeParse({
			name: "Jean Dupont",
			email: "jean@example.com",
			password: "password123",
			confirmPassword: "password123",
		});
		expect(result.success).toBe(true);
	});

	it("should reject password mismatch", () => {
		const result = registerSchema.safeParse({
			name: "Jean Dupont",
			email: "jean@example.com",
			password: "password123",
			confirmPassword: "different",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const mismatchError = result.error.issues.find((i) =>
				i.path.includes("confirmPassword"),
			);
			expect(mismatchError?.message).toBe(
				"Les mots de passe ne correspondent pas",
			);
		}
	});

	it("should reject name shorter than 2 characters", () => {
		const result = registerSchema.safeParse({
			name: "J",
			email: "jean@example.com",
			password: "password123",
			confirmPassword: "password123",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((i) =>
				i.path.includes("name"),
			);
			expect(nameError?.message).toBe("2 caractères minimum");
		}
	});
});
