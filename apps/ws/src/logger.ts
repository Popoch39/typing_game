const COLORS = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
};

function ts(): string {
	return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function short(id: string): string {
	return id.slice(0, 8);
}

export const log = {
	conn(userId: string, name: string) {
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.green}▶ connect${COLORS.reset}    ${name} ${COLORS.dim}(${short(userId)})${COLORS.reset}`,
		);
	},
	disc(userId: string, name: string) {
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.red}▮ disconnect${COLORS.reset} ${name} ${COLORS.dim}(${short(userId)})${COLORS.reset}`,
		);
	},
	msg(userId: string, type: string, extra?: string) {
		if (type === "keystroke") return;
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.cyan}← ${type}${COLORS.reset}${COLORS.dim}${extra ? `  ${extra}` : ""}  from ${short(userId)}${COLORS.reset}`,
		);
	},
	send(userId: string, type: string, extra?: string) {
		if (type === "opponent_progress" || type === "self_stats") return;
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.magenta}→ ${type}${COLORS.reset}${COLORS.dim}${extra ? `  ${extra}` : ""}  to ${short(userId)}${COLORS.reset}`,
		);
	},
	room(action: string, roomId: string, extra?: string) {
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.yellow}◆ room:${action}${COLORS.reset} ${COLORS.dim}${short(roomId)}${extra ? `  ${extra}` : ""}${COLORS.reset}`,
		);
	},
	queue(action: string, userId: string, duration: number, queueSize: number) {
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.yellow}◇ queue:${action}${COLORS.reset} ${COLORS.dim}${short(userId)}  dur=${duration}s  waiting=${queueSize}${COLORS.reset}`,
		);
	},
	info(message: string) {
		console.log(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.bold}${message}${COLORS.reset}`,
		);
	},
	error(message: string, err?: unknown) {
		console.error(
			`${COLORS.dim}${ts()}${COLORS.reset} ${COLORS.red}✗ ${message}${COLORS.reset}`,
			err ?? "",
		);
	},
};
