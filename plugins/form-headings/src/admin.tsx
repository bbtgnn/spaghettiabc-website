import { Text } from "@cloudflare/kumo";
import * as React from "react";

export type HeadingFieldProps = {
	label?: string;
	value?: boolean;
	onChange?: (value: boolean) => void;
	minimal?: boolean;
};

export function HeadingField({ label, minimal }: HeadingFieldProps) {
	const rootRef = React.useRef<HTMLDivElement>(null);
	const [showRule, setShowRule] = React.useState(true);

	React.useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const headings = [
			...document.querySelectorAll<HTMLElement>(".form-headings-field"),
		];
		setShowRule(headings.indexOf(el) > 0);
	}, []);

	if (!label) {
		return null;
	}

	const outer = showRule
		? minimal
			? "pt-6"
			: "pt-8"
		: minimal
			? "pt-2"
			: "pt-3";

	const inner = showRule
		? minimal
			? "border-t border-kumo-hairline pt-4 pb-3"
			: "border-t border-kumo-hairline pt-5 pb-3"
		: "pb-3";

	return (
		<div
			ref={rootRef}
			className={`form-headings-field ${outer}`}
			data-minimal={minimal ? "true" : undefined}
			data-first={showRule ? undefined : "true"}
			role="group"
			aria-label={label}
		>
			<div className={inner}>
				<Text variant="heading" size={minimal ? undefined : "lg"} as="p">
					{label}
				</Text>
			</div>
		</div>
	);
}

export const fields = {
	heading: HeadingField,
};
