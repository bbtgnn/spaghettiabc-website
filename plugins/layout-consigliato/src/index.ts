import { definePlugin, type PluginDescriptor } from "emdash";

export function layoutConsigliatoPlugin(): PluginDescriptor {
	return {
		id: "layout-consigliato",
		version: "1.0.0",
		entrypoint: "@spaghettiabc/layout-consigliato",
		adminEntry: "@spaghettiabc/layout-consigliato/admin",
	};
}

export function createPlugin() {
	return definePlugin({
		id: "layout-consigliato",
		version: "1.0.0",
		admin: {
			entry: "@spaghettiabc/layout-consigliato/admin",
			pages: [
				{
					path: "/",
					label: "Layout consigliato",
					icon: "sidebar-simple",
				},
			],
		},
	});
}

export default createPlugin;
