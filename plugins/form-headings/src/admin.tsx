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

	return (
		<div
			ref={rootRef}
			className="form-headings-field"
			data-minimal={minimal ? "true" : undefined}
			data-first={showRule ? undefined : "true"}
			role="group"
			aria-label={label}
		>
			{showRule ? (
				<hr className="form-headings-field__rule" aria-hidden="true" />
			) : null}
			<p className="form-headings-field__title">{label}</p>
			<style>{`
				.form-headings-field {
					margin: 2.75rem 0 1.25rem;
					padding: 0;
				}
				.form-headings-field[data-first="true"] {
					margin-top: 0.5rem;
				}
				.form-headings-field[data-minimal="true"] {
					margin-top: 2rem;
					margin-bottom: 1rem;
				}
				.form-headings-field[data-first="true"][data-minimal="true"] {
					margin-top: 0.35rem;
				}
				.form-headings-field__rule {
					margin: 0 0 0.85rem;
					border: 0;
					border-top: 1px solid rgba(255, 255, 255, 0.35);
				}
				.form-headings-field__title {
					margin: 0;
					font-size: 1.5rem;
					font-weight: 600;
					line-height: 1.2;
					letter-spacing: normal;
					text-transform: none;
					color: #fff;
				}
				.form-headings-field[data-minimal="true"] .form-headings-field__title {
					font-size: 1.25rem;
				}
			`}</style>
		</div>
	);
}

export const fields = {
	heading: HeadingField,
};
