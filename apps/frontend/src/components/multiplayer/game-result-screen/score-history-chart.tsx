"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import type { ScoreHistoryPoint } from "@/lib/multiplayer-client";

const chartConfig = {
	selfWpm: {
		label: "You",
		color: "var(--color-chart-1)",
	},
	oppWpm: {
		label: "Opponent",
		color: "var(--color-chart-2)",
	},
} satisfies ChartConfig;

function ErrorDot(props: {
	cx?: number;
	cy?: number;
	payload?: ScoreHistoryPoint;
	field: "selfErrors" | "oppErrors";
	color: string;
}) {
	const { cx, cy, payload, field, color } = props;
	if (cx == null || cy == null || !payload) return null;
	const errors = payload[field];
	if (errors <= 0) return null;
	const r = Math.min(3 + errors * 2, 10);
	return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.7} />;
}

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ dataKey: string; value: number; color: string }>;
	label?: number;
}) {
	if (!active || !payload?.length) return null;
	const point = payload[0]?.payload as ScoreHistoryPoint | undefined;
	if (!point) return null;

	return (
		<div className="bg-background border-border rounded-md border px-3 py-2 text-xs shadow-md">
			<p className="text-muted-foreground mb-1 font-medium">{label}s</p>
			<div className="space-y-0.5">
				<p style={{ color: "var(--color-chart-1)" }}>
					You: {point.selfWpm} wpm
					{point.selfErrors > 0 && (
						<span className="text-destructive ml-1">
							({point.selfErrors} err)
						</span>
					)}
				</p>
				<p style={{ color: "var(--color-chart-2)" }}>
					Opp: {point.oppWpm} wpm
					{point.oppErrors > 0 && (
						<span className="text-destructive ml-1">
							({point.oppErrors} err)
						</span>
					)}
				</p>
			</div>
		</div>
	);
}

export function ScoreHistoryChart({
	data,
	duration,
}: {
	data: ScoreHistoryPoint[];
	duration?: number;
}) {
	if (data.length < 2) return null;

	const maxElapsed = duration ?? data[data.length - 1]?.elapsed ?? 0;

	// Ensure data starts at 0
	const chartData =
		data[0]?.elapsed === 0
			? data
			: [
					{
						elapsed: 0,
						selfWpm: 0,
						oppWpm: 0,
						selfScore: 0,
						oppScore: 0,
						selfErrors: 0,
						oppErrors: 0,
					},
					...data,
				];

	return (
		<ChartContainer config={chartConfig} className="h-48 w-full">
			<LineChart data={chartData} accessibilityLayer>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="elapsed"
					tickLine={false}
					axisLine={false}
					type="number"
					domain={[0, maxElapsed]}
					tickFormatter={(v) => `${v}s`}
				/>
				<YAxis tickLine={false} axisLine={false} width={40} />
				<ChartTooltip content={<CustomTooltip />} />
				<Line
					dataKey="selfWpm"
					type="monotone"
					stroke="var(--color-selfWpm)"
					strokeWidth={2}
					dot={(props) => (
						<ErrorDot
							key={props.key}
							{...props}
							field="selfErrors"
							color="var(--color-destructive)"
						/>
					)}
					activeDot={false}
				/>
				<Line
					dataKey="oppWpm"
					type="monotone"
					stroke="var(--color-oppWpm)"
					strokeWidth={2}
					strokeDasharray="5 5"
					dot={(props) => (
						<ErrorDot
							key={props.key}
							{...props}
							field="oppErrors"
							color="var(--color-chart-4)"
						/>
					)}
					activeDot={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
