/**
 * WXR → recipes seed fragment
 *
 * Reads:  import/spaghettiabc-export-wordpress.xml
 * Writes: seed/generated/recipes-from-wxr.json
 *
 * Output shape:
 * {
 *   "taxonomyTerms": [ { "slug", "label" } ],  // WP category domain → Categoria ricetta
 *   "entries": [                                 // ready for seed.json content.recipes
 *     {
 *       "id", "slug", "status": "published",
 *       "data": {
 *         "title",
 *         "featured_image": { "$media": { "url", "alt", "filename" } } | null,
 *         "content": PortableTextBlock[]
 *       },
 *       "taxonomies": { "recipe_category": string[] }
 *     }
 *   ],
 *   "meta": { "source", "generatedAt", "recipeCount", "taxonomyTermCount", "skipped" }
 * }
 *
 * Taxonomy machine name `recipe_category` is a proposal for the schema agent
 * (label: Categoria ricetta). Do not merge into seed/seed.json from this script.
 *
 * Usage: bun scripts/wxr-to-recipes-seed.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WXR_PATH = path.join(ROOT, "import", "spaghettiabc-export-wordpress.xml");
const OUT_PATH = path.join(ROOT, "seed", "generated", "recipes-from-wxr.json");

const TAXONOMY_KEY = "recipe_category";

// --- WXR parse --------------------------------------------------------------

function splitItems(xml) {
	const items = [];
	let i = 0;
	while (true) {
		const start = xml.indexOf("<item>", i);
		if (start < 0) break;
		const end = xml.indexOf("</item>", start);
		if (end < 0) break;
		items.push(xml.slice(start, end + 7));
		i = end + 7;
	}
	return items;
}

function cdata(tag, s) {
	const re = new RegExp(
		`<${tag}>(?:<!\\[CDATA\\[(.*?)\\]\\]>|([^<]*))</${tag}>`,
		"s",
	);
	const m = s.match(re);
	return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function postMeta(item) {
	const map = new Map();
	for (const m of item.matchAll(
		/<wp:meta_key><!\[CDATA\[(.*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(.*?)\]\]><\/wp:meta_value>/gs,
	)) {
		map.set(m[1], m[2]);
	}
	return map;
}

function postCategories(item) {
	const terms = [];
	for (const m of item.matchAll(
		/<category domain="category" nicename="([^"]*)"><!\[CDATA\[(.*?)\]\]><\/category>/gs,
	)) {
		terms.push({ slug: normalizeSlug(m[1]), label: decodeEntities(m[2]) });
	}
	return terms;
}

// --- slug / text helpers ----------------------------------------------------

function normalizeSlug(raw) {
	return String(raw || "")
		.trim()
		.toLowerCase()
		.replace(/&amp;/g, "and")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

function decodeEntities(text) {
	return String(text)
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, h) =>
			String.fromCharCode(parseInt(h, 16)),
		);
}

function filenameFromUrl(url) {
	try {
		const base = path.basename(new URL(url).pathname);
		return base || "featured.jpg";
	} catch {
		return "featured.jpg";
	}
}

function keyGen(prefix = "k") {
	let n = 0;
	return () => `${prefix}${n++}`;
}

// --- body cleanup -----------------------------------------------------------

function stripShortcodes(html) {
	let s = html;
	// Self-closing / void-ish shortcodes with attrs (agni_button, agni_separator, …)
	s = s.replace(/\[[a-zA-Z0-9_-]+[^\]]*\/\]/g, "\n");
	s = s.replace(/\[[a-zA-Z0-9_-]+[^\]]*\]/g, "\n");
	s = s.replace(/\[\/[a-zA-Z0-9_-]+\]/g, "\n");
	return s;
}

function stripNewsletterCta(html) {
	const markers = [
		/Did you like my recipe\?/i,
		/Subscribe to my monthly newsletter/i,
		/Subscribe to my newsletter/i,
		/spaghettiabc\.substack\.com\/subscribe/i,
	];
	let cut = -1;
	for (const re of markers) {
		const m = html.match(re);
		if (m && m.index != null) {
			cut = cut < 0 ? m.index : Math.min(cut, m.index);
		}
	}
	if (cut >= 0) {
		// Prefer cutting at a shortcode / separator boundary before the CTA.
		const before = html.slice(0, cut);
		const sep = Math.max(
			before.lastIndexOf("[agni_separator]"),
			before.lastIndexOf("[vc_column_text]"),
			before.lastIndexOf("[/vc_column_text]"),
		);
		if (sep >= 0 && cut - sep < 80) return before.slice(0, sep);
		return before;
	}
	// Drop trailing subscribe buttons even without prose CTA.
	return html.replace(
		/\[agni_button[^\]]*substack[^\]]*\][\s\S]*$/i,
		"",
	);
}

function stripTagsKeepBreaks(html) {
	let s = html;
	s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
	s = s.replace(/<\s*\/\s*p\s*>/gi, "\n\n");
	s = s.replace(/<\s*p\b[^>]*>/gi, "");
	s = s.replace(/<\s*\/\s*div\s*>/gi, "\n");
	s = s.replace(/<\s*div\b[^>]*>/gi, "");
	s = s.replace(/<\s*h([1-6])\b[^>]*>/gi, (_, level) => `\n@@@H${level}@@@`);
	s = s.replace(/<\s*\/\s*h[1-6]\s*>/gi, "\n");
	s = s.replace(/<\s*li\b[^>]*>/gi, "\n• ");
	s = s.replace(/<\s*\/\s*li\s*>/gi, "");
	s = s.replace(/<\s*\/?\s*ul\b[^>]*>/gi, "\n");
	s = s.replace(/<\s*\/?\s*ol\b[^>]*>/gi, "\n");
	// Keep emphasis markers as lightweight tokens for span conversion.
	s = s.replace(/<\s*(strong|b)\b[^>]*>/gi, "[[[strong]]]");
	s = s.replace(/<\s*\/\s*(strong|b)\s*>/gi, "[[[/strong]]]");
	s = s.replace(/<\s*(em|i)\b[^>]*>/gi, "[[[em]]]");
	s = s.replace(/<\s*\/\s*(em|i)\s*>/gi, "[[[/em]]]");
	s = s.replace(/<\s*a\b[^>]*href=["']([^"']+)["'][^>]*>/gi, "[[[a|$1]]]");
	s = s.replace(/<\s*\/\s*a\s*>/gi, "[[[/a]]]");
	// Drop remaining tags (spans, etc.)
	s = s.replace(/<[^>]+>/g, "");
	return decodeEntities(s);
}

function spansFromMarkedText(text, nextKey) {
	const children = [];
	const markStack = [];
	const linkDefs = [];
	const tokenRe =
		/\[\[\[(\/?)(strong|em|a)(?:\|([^\]]+))?\]\]\]|([^\[\]]+|\[+|]+)/g;
	let m;
	while ((m = tokenRe.exec(text)) !== null) {
		if (m[2]) {
			const closing = m[1] === "/";
			const kind = m[2];
			if (!closing) {
				if (kind === "a") {
					const href = m[3] || "";
					const key = nextKey("link");
					linkDefs.push({
						_type: "link",
						_key: key,
						href,
					});
					markStack.push(key);
				} else {
					markStack.push(kind);
				}
			} else {
				// pop matching mark
				for (let i = markStack.length - 1; i >= 0; i--) {
					const cur = markStack[i];
					if (
						(kind === "a" && cur.startsWith("link")) ||
						cur === kind
					) {
						markStack.splice(i, 1);
						break;
					}
				}
			}
			continue;
		}
		const chunk = m[0];
		if (!chunk) continue;
		const span = {
			_type: "span",
			text: chunk,
			_key: nextKey("s"),
		};
		if (markStack.length) span.marks = [...markStack];
		children.push(span);
	}
	if (!children.length) {
		children.push({ _type: "span", text: "", _key: nextKey("s") });
	}
	return { children, markDefs: linkDefs };
}

function htmlToPortableText(rawHtml) {
	const nextKey = keyGen();
	let cleaned = stripNewsletterCta(rawHtml);
	cleaned = stripShortcodes(cleaned);
	cleaned = stripTagsKeepBreaks(cleaned);
	cleaned = cleaned.replace(/\r\n/g, "\n");
	cleaned = cleaned.replace(/[ \t]+\n/g, "\n");
	cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
	cleaned = cleaned.trim();

	const blocks = [];
	const paragraphs = cleaned.split(/\n{2,}/);

	for (const para of paragraphs) {
		const lines = para
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		if (!lines.length) continue;

		// Single heading line
		if (lines.length === 1 && lines[0].startsWith("@@@H")) {
			const hm = lines[0].match(/^@@@H([1-6])@@@(.*)$/);
			if (hm) {
				const style = `h${hm[1]}`;
				const { children, markDefs } = spansFromMarkedText(
					hm[2].trim(),
					nextKey,
				);
				const block = {
					_type: "block",
					style,
					children,
					_key: nextKey("b"),
				};
				if (markDefs.length) block.markDefs = markDefs;
				blocks.push(block);
				continue;
			}
		}

		// Bullet list run
		if (lines.every((l) => l.startsWith("• "))) {
			for (const line of lines) {
				const { children, markDefs } = spansFromMarkedText(
					line.replace(/^•\s+/, ""),
					nextKey,
				);
				const block = {
					_type: "block",
					style: "normal",
					listItem: "bullet",
					level: 1,
					children,
					_key: nextKey("b"),
				};
				if (markDefs.length) block.markDefs = markDefs;
				blocks.push(block);
			}
			continue;
		}

		// Mixed: emit each line as its own block (WP bodies are often newline-separated steps)
		for (const line of lines) {
			let style = "normal";
			let text = line;
			const hm = line.match(/^@@@H([1-6])@@@(.*)$/);
			if (hm) {
				style = `h${hm[1]}`;
				text = hm[2].trim();
			} else if (line.startsWith("• ")) {
				const { children, markDefs } = spansFromMarkedText(
					line.replace(/^•\s+/, ""),
					nextKey,
				);
				const block = {
					_type: "block",
					style: "normal",
					listItem: "bullet",
					level: 1,
					children,
					_key: nextKey("b"),
				};
				if (markDefs.length) block.markDefs = markDefs;
				blocks.push(block);
				continue;
			}

			const { children, markDefs } = spansFromMarkedText(text, nextKey);
			const block = {
				_type: "block",
				style,
				children,
				_key: nextKey("b"),
			};
			if (markDefs.length) block.markDefs = markDefs;
			blocks.push(block);
		}
	}

	if (!blocks.length) {
		blocks.push({
			_type: "block",
			style: "normal",
			children: [{ _type: "span", text: "", _key: nextKey("s") }],
			_key: nextKey("b"),
		});
	}

	return blocks;
}

// --- main -------------------------------------------------------------------

function main() {
	if (!fs.existsSync(WXR_PATH)) {
		console.error(`Missing WXR at ${WXR_PATH}`);
		process.exit(1);
	}

	const xml = fs.readFileSync(WXR_PATH, "utf8");
	const items = splitItems(xml);

	const attachments = new Map();
	for (const item of items) {
		if (cdata("wp:post_type", item) !== "attachment") continue;
		const id = cdata("wp:post_id", item);
		const url = cdata("wp:attachment_url", item);
		const title = cdata("title", item);
		if (id && url) attachments.set(id, { url, title });
	}

	const termMap = new Map(); // slug → label
	const entries = [];
	const skipped = [];
	const usedSlugs = new Set();

	for (const item of items) {
		if (cdata("wp:post_type", item) !== "post") continue;
		if (cdata("wp:status", item) !== "publish") {
			skipped.push({
				reason: `status:${cdata("wp:status", item) || "unknown"}`,
				title: cdata("title", item),
				wpId: cdata("wp:post_id", item),
			});
			continue;
		}

		const title = decodeEntities(cdata("title", item));
		const wpId = cdata("wp:post_id", item);
		let slug = normalizeSlug(cdata("wp:post_name", item) || title);
		if (!slug) slug = `recipe-${wpId}`;
		if (usedSlugs.has(slug)) slug = `${slug}-${wpId}`;
		usedSlugs.add(slug);

		const cats = postCategories(item);
		for (const t of cats) {
			if (!termMap.has(t.slug)) termMap.set(t.slug, t.label);
		}

		const meta = postMeta(item);
		const thumbId = meta.get("_thumbnail_id");
		const att = thumbId ? attachments.get(thumbId) : null;
		let featured_image = null;
		if (att?.url) {
			featured_image = {
				$media: {
					url: att.url,
					alt: title,
					filename: filenameFromUrl(att.url),
				},
			};
		}

		const contentHtml = cdata("content:encoded", item);
		const content = htmlToPortableText(contentHtml);

		entries.push({
			id: `recipe-${slug}`,
			slug,
			status: "published",
			data: {
				title,
				featured_image,
				content,
			},
			taxonomies: {
				[TAXONOMY_KEY]: cats.map((c) => c.slug),
			},
		});
	}

	// Stable order: by slug
	entries.sort((a, b) => a.slug.localeCompare(b.slug));

	const taxonomyTerms = [...termMap.entries()]
		.map(([slug, label]) => ({ slug, label }))
		.sort((a, b) => a.slug.localeCompare(b.slug));

	const out = {
		taxonomyTerms,
		entries,
		meta: {
			source: "import/spaghettiabc-export-wordpress.xml",
			generatedAt: new Date().toISOString(),
			recipeCount: entries.length,
			taxonomyTermCount: taxonomyTerms.length,
			taxonomyKey: TAXONOMY_KEY,
			skipped,
			notes: [
				"featured_image uses remote $media URLs (spaghettiabc.com); local ingest deferred",
				"WP post_tag domain ignored; only category → recipe_category",
				"WPBakery / Agni shortcodes stripped best-effort; newsletter/Substack CTA tails removed when markers match",
			],
		},
	};

	fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, "\t") + "\n", "utf8");

	console.log(
		`Wrote ${entries.length} recipes, ${taxonomyTerms.length} taxonomy terms → ${path.relative(ROOT, OUT_PATH)}`,
	);
	if (skipped.length) {
		console.log(`Skipped ${skipped.length}:`, skipped);
	}
	const missingImage = entries.filter((e) => !e.data.featured_image).length;
	if (missingImage) {
		console.log(`Recipes without featured_image: ${missingImage}`);
	}
}

main();
