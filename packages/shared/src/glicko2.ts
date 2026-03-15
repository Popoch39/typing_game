export interface GlickoPlayer {
	rating: number;
	rd: number;
	volatility: number;
}

export interface GlickoResult {
	rating: number;
	rd: number;
	volatility: number;
}

export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_VOLATILITY = 0.06;
export const TAU = 0.5;
export const CONVERGENCE_TOLERANCE = 0.000001;

const SCALING_FACTOR = 173.7178;

function toGlicko2Scale(rating: number): number {
	return (rating - 1500) / SCALING_FACTOR;
}

function toGlicko1Scale(mu: number): number {
	return mu * SCALING_FACTOR + 1500;
}

function g(phi: number): number {
	return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
	return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

export function computeGlicko2(
	player: GlickoPlayer,
	opponent: GlickoPlayer,
	score: number,
): GlickoResult {
	// Step 1: Convert to Glicko-2 scale
	const mu = toGlicko2Scale(player.rating);
	const phi = player.rd / SCALING_FACTOR;
	const sigma = player.volatility;

	const muJ = toGlicko2Scale(opponent.rating);
	const phiJ = opponent.rd / SCALING_FACTOR;

	// Step 2: Compute g and E
	const gPhiJ = g(phiJ);
	const eVal = E(mu, muJ, phiJ);

	// Step 3: Compute estimated variance v
	const v = 1 / (gPhiJ * gPhiJ * eVal * (1 - eVal));

	// Step 4: Compute delta
	const delta = v * gPhiJ * (score - eVal);

	// Step 5: Compute new volatility using Illinois algorithm
	const a = Math.log(sigma * sigma);
	const tau2 = TAU * TAU;

	const f = (x: number): number => {
		const ex = Math.exp(x);
		const phi2 = phi * phi;
		const num1 = ex * (delta * delta - phi2 - v - ex);
		const den1 = 2 * (phi2 + v + ex) * (phi2 + v + ex);
		return num1 / den1 - (x - a) / tau2;
	};

	let A = a;
	let B: number;

	if (delta * delta > phi * phi + v) {
		B = Math.log(delta * delta - phi * phi - v);
	} else {
		let k = 1;
		while (f(a - k * TAU) < 0) {
			k++;
		}
		B = a - k * TAU;
	}

	let fA = f(A);
	let fB = f(B);

	for (let i = 0; i < 100; i++) {
		if (Math.abs(B - A) <= CONVERGENCE_TOLERANCE) break;

		const C = A + ((A - B) * fA) / (fB - fA);
		const fC = f(C);

		if (fC * fB <= 0) {
			A = B;
			fA = fB;
		} else {
			fA = fA / 2;
		}

		B = C;
		fB = fC;
	}

	const newSigma = Math.exp(A / 2);

	// Step 6: Compute pre-rating period phi*
	const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

	// Step 7: Compute new phi and mu
	const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
	const newMu = mu + newPhi * newPhi * gPhiJ * (score - eVal);

	// Step 8: Convert back to Glicko-1 scale
	return {
		rating: toGlicko1Scale(newMu),
		rd: newPhi * SCALING_FACTOR,
		volatility: newSigma,
	};
}

export function decayRD(player: GlickoPlayer, daysSinceLastGame: number): number {
	if (daysSinceLastGame === 0) return player.rd;

	const phi = player.rd / SCALING_FACTOR;
	const sigma = player.volatility;

	const newPhi = Math.sqrt(phi * phi + daysSinceLastGame * sigma * sigma);
	const newRD = newPhi * SCALING_FACTOR;

	return Math.min(newRD, DEFAULT_RD);
}

export function expectedScore(player: GlickoPlayer, opponent: GlickoPlayer): number {
	const mu = toGlicko2Scale(player.rating);
	const muJ = toGlicko2Scale(opponent.rating);
	const phiJ = opponent.rd / SCALING_FACTOR;

	return E(mu, muJ, phiJ);
}
