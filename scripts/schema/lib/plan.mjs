/**
 * Pure planning for `schema:apply`: from a live position, the requested phase and the migrations, the ordered
 * list of steps. Executing is `apply.mjs`'s job; this file has no I/O so it is unit-testable.
 *
 * Phases
 *   all   every remaining migration: pre ops -> backfills -> post ops.
 *   pre   (before the code deploy) pre ops + backfills of remaining migrations, in order, stopping after the first
 *         migration that has post ops (its post ops, and every later migration, wait for the post phase).
 *   post  (after the code deploy) finish the in-progress migration: catch-up backfills (entries created between
 *         pre and the deploy), the pending-draft gate, post ops; then every later migration completely.
 *
 * Step kinds
 *   { kind: "ops", migration, k, from, to, ops, label, destructive? }   expected position afterwards: (k, to)
 *   { kind: "backfill", migration, k, backfill, catchUp }
 *   { kind: "gate", migration, k, checks: [{ backfill, field }] }       runs right before post ops
 *
 * `loc` = { k, n }: migrations[0..k-1] applied, first n ops of migrations[k] applied (see position.mjs).
 */
import { describeOp } from "./model.mjs";


export function buildPlan({ migrations, loc, phase }) {
	const steps = [];
	const notes = [];
	for (let k = loc.k; k < migrations.length; k++) {
		const m = migrations[k];
		const preLen = m.preOps.length;
		const resume = k === loc.k && loc.n > 0;
		const startN = resume ? loc.n : 0;
		const fresh = !resume || startN < preLen; // backfills have not run yet
		const hasPost = m.postOps.length > 0;
		const postFrom = Math.max(startN, preLen);
		const doPost = phase !== "pre" && postFrom < m.ops.length;

		if (startN < preLen) steps.push({ kind: "ops", migration: m.id, k, from: startN, to: preLen, ops: m.ops.slice(startN, preLen), label: `${m.id} pre` });

		const backfills = m.backfills.length > 0 && (fresh || doPost || startN === preLen);
		if (backfills) for (const b of m.backfills) steps.push({ kind: "backfill", migration: m.id, k, backfill: b, catchUp: !fresh });

		if (doPost) {
			const checks = [];
			for (const op of m.ops.slice(postFrom)) {
				if (op.op !== "removeField") continue;
				for (const b of m.backfills) if (b.collection === op.collection && b.from === op.field) checks.push({ backfill: b, field: `${op.collection}.${op.field}` });
			}
			if (checks.length) steps.push({ kind: "gate", migration: m.id, k, checks });
			steps.push({ kind: "ops", migration: m.id, k, from: postFrom, to: m.ops.length, ops: m.ops.slice(postFrom), label: `${m.id} post`, destructive: true });
		}
		if (phase === "pre" && hasPost) {
			notes.push(`${m.id} has post ops (removeField/deleteCollection): they run in the post phase`);
			const later = migrations.slice(k + 1).map((x) => x.id);
			if (later.length) notes.push(`not started until the post phase: ${later.join(", ")}`);
			break;
		}
	}
	return { steps, notes };
}

/** one-line description of a step for the human/JSON plan */
export function describeStep(step) {
	switch (step.kind) {
		case "ops":
			return `${step.label}${step.destructive ? " [destructive]" : ""}: ${step.ops.map(describeOp).join("; ")}`;
		case "backfill": {
			const b = step.backfill;
			return `${step.migration} backfill${step.catchUp ? " (catch-up)" : ""} ${b.id}: ${b.collection}.${b.from} -> ${b.to} (${b.transform}, locales: ${b.locales})`;
		}
		case "gate":
			return `${step.migration} gate: no entry may lack the backfilled value before removing ${step.checks.map((c) => c.field).join(", ")}`;
		default:
			return JSON.stringify(step);
	}
}
