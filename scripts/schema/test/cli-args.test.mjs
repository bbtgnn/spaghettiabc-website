import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs, LoopError } from "../lib/cli.mjs";
import { EXIT } from "../lib/errors.mjs";

const USAGE = "prog [--flag val] [name]";
const spec = { _: "string", flag: "string", tag: "string[]", quiet: "boolean" };

test("parseArgs: optional positional `_` and repeatable string[]", () => {
	assert.deepEqual(parseArgs(["my-name", "--flag", "a", "--tag", "x", "--tag=y", "--quiet"], spec, USAGE), {
		_: "my-name",
		flag: "a",
		tag: ["x", "y"],
		quiet: true,
	});
	assert.deepEqual(parseArgs([], spec, USAGE), { tag: [] });
});

test("parseArgs: second positional and unknown flag are USAGE", () => {
	for (const argv of [["a", "b"], ["--nope"]]) {
		assert.throws(() => parseArgs(argv, spec, USAGE), (e) => e instanceof LoopError && e.exit === EXIT.USAGE);
	}
});
