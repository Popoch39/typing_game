import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { log } from "../logger";

describe("logger", () => {
	let logSpy: ReturnType<typeof spyOn>;
	let errorSpy: ReturnType<typeof spyOn>;
	let logCountBefore: number;
	let errorCountBefore: number;

	beforeEach(() => {
		logSpy = spyOn(console, "log").mockImplementation(() => {});
		errorSpy = spyOn(console, "error").mockImplementation(() => {});
		logCountBefore = logSpy.mock.calls.length;
		errorCountBefore = errorSpy.mock.calls.length;
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	function logCallCount() {
		return logSpy.mock.calls.length - logCountBefore;
	}

	function errorCallCount() {
		return errorSpy.mock.calls.length - errorCountBefore;
	}

	it("conn calls console.log", () => {
		log.conn("user-id-1234", "Alice");
		expect(logCallCount()).toBe(1);
	});

	it("disc calls console.log", () => {
		log.disc("user-id-1234", "Alice");
		expect(logCallCount()).toBe(1);
	});

	it("msg calls console.log for normal types", () => {
		log.msg("user-id-1234", "join_queue");
		expect(logCallCount()).toBe(1);
	});

	it("msg is silent for keystroke type", () => {
		log.msg("user-id-1234", "keystroke");
		expect(logCallCount()).toBe(0);
	});

	it("msg passes extra string when provided", () => {
		log.msg("user-id-1234", "join_queue", "dur=30");
		expect(logCallCount()).toBe(1);
	});

	it("send calls console.log for normal types", () => {
		log.send("user-id-1234", "match_found");
		expect(logCallCount()).toBe(1);
	});

	it("send is silent for opponent_progress", () => {
		log.send("user-id-1234", "opponent_progress");
		expect(logCallCount()).toBe(0);
	});

	it("send is silent for self_stats", () => {
		log.send("user-id-1234", "self_stats");
		expect(logCallCount()).toBe(0);
	});

	it("send passes extra string when provided", () => {
		log.send("user-id-1234", "match_found", "room=abc");
		expect(logCallCount()).toBe(1);
	});

	it("room calls console.log", () => {
		log.room("create", "room-id-1234");
		expect(logCallCount()).toBe(1);
	});

	it("room passes extra string when provided", () => {
		log.room("create", "room-id-1234", "code=ABC");
		expect(logCallCount()).toBe(1);
	});

	it("queue calls console.log", () => {
		log.queue("join", "user-id-1234", 30, 1);
		expect(logCallCount()).toBe(1);
	});

	it("info calls console.log", () => {
		log.info("Server started");
		expect(logCallCount()).toBe(1);
	});

	it("error calls console.error", () => {
		log.error("Something broke");
		expect(errorCallCount()).toBe(1);
	});

	it("error passes error object when provided", () => {
		const err = new Error("test");
		log.error("Something broke", err);
		expect(errorCallCount()).toBe(1);
	});
});
