export type {
	ClientMessage,
	ServerMessage,
	PlayerResult,
} from "@repo/shared/ws-protocol";

export interface Player {
	ws: {
		send: (data: string) => void;
		close: () => void;
	};
	userId: string;
	name: string;
}
