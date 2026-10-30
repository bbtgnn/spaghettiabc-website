import { definePlugin, type PluginDescriptor } from "emdash";

export function formHeadingsPlugin(): PluginDescriptor {
	return {
		id: "form-headings",
		version: "1.0.0",
		entrypoint: "@spaghettiabc/form-headings",
		adminEntry: "@spaghettiabc/form-headings/admin",
	};
}

export function createPlugin() {
	return definePlugin({
		id: "form-headings",
		version: "1.0.0",
		admin: {
			entry: "@spaghettiabc/form-headings/admin",
			fieldWidgets: [
				{
					name: "heading",
					label: "Form section heading",
					fieldTypes: ["boolean"],
				},
			],
		},
	});
}

export default createPlugin;
