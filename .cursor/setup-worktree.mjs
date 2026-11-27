// Allocate a free dev PORT for this worktree. Writes `.env.local` only; never reads `.env`.
import { writeFileSync } from "node:fs";
import net from "node:net";

const BASE = 4321;
const SPAN = 1000; // 4321–5320

// No host argument: binds all interfaces, so IPv4/IPv6 listeners are both detected.
const isFree = (port) =>
	new Promise((resolve) => {
		const server = net.createServer().once("error", () => resolve(false));
		server.listen(port, () => server.close(() => resolve(true)));
	});

const start = Math.floor(Math.random() * SPAN);
let port;
for (let i = 0; i < SPAN && !port; i++) {
	const candidate = BASE + ((start + i) % SPAN);
	if (await isFree(candidate)) port = candidate;
}
if (!port) throw new Error(`No free port in ${BASE}–${BASE + SPAN - 1}`);

writeFileSync(new URL("../.env.local", import.meta.url), `PORT=${port}\n`);
console.log(`Worktree PORT=${port} (http://localhost:${port})`);
