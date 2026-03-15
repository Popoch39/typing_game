import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScoreHistoryPoint } from "@/lib/multiplayer-client";
import { ScoreHistoryChart } from "../score-history-chart";

// Mock recharts ResponsiveContainer which needs DOM dimensions
vi.mock("recharts", async () => {
	const actual = await vi.importActual<typeof import("recharts")>("recharts");
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div
				data-testid="responsive-container"
				style={{ width: 500, height: 200 }}
			>
				{children}
			</div>
		),
	};
});

describe("ScoreHistoryChart", () => {
	it("returns null when data has fewer than 2 points", () => {
		const data: ScoreHistoryPoint[] = [
			{
				elapsed: 1,
				selfScore: 10,
				oppScore: 5,
				selfWpm: 30,
				oppWpm: 25,
				selfErrors: 0,
				oppErrors: 0,
			},
		];
		const { container } = render(
			<ScoreHistoryChart data={data} duration={15} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("returns null with empty data", () => {
		const { container } = render(<ScoreHistoryChart data={[]} duration={15} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders chart when data has 2+ points", () => {
		const data: ScoreHistoryPoint[] = [
			{
				elapsed: 1,
				selfScore: 10,
				oppScore: 5,
				selfWpm: 30,
				oppWpm: 25,
				selfErrors: 0,
				oppErrors: 0,
			},
			{
				elapsed: 2,
				selfScore: 25,
				oppScore: 15,
				selfWpm: 45,
				oppWpm: 35,
				selfErrors: 1,
				oppErrors: 0,
			},
			{
				elapsed: 3,
				selfScore: 40,
				oppScore: 30,
				selfWpm: 55,
				oppWpm: 40,
				selfErrors: 0,
				oppErrors: 2,
			},
		];
		const { container } = render(
			<ScoreHistoryChart data={data} duration={15} />,
		);
		expect(container.querySelector("[data-slot='chart']")).toBeTruthy();
	});
});
