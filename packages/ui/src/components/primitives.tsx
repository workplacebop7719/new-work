/**
 * Accessible primitives — BRD-004.
 *
 * "Components cannot be released to production until their documented keyboard,
 * focus, screen-reader, zoom and contrast behaviours pass" (PRD §14). Each
 * component here is small on purpose: the accessible behaviour is in semantic
 * HTML, not in JavaScript that reimplements it.
 *
 * Nothing in this file conveys meaning through colour, hover, drag, animation or
 * pointer precision alone (ENG-004).
 */
import * as React from 'react';

/* ------------------------------------------------------------------ */
/* Text alternatives                                                    */
/* ------------------------------------------------------------------ */

/** Visible to assistive technology, not to sighted users. */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="ns-visually-hidden">{children}</span>;
}

/**
 * Skip link (ACC-002). Hidden until focused, then fully visible — never
 * `display: none`, which would remove it from the tab order entirely.
 */
export function SkipLink({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  return (
    <a className="ns-skip-link" href={`#${targetId}`}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'quiet';
  /**
   * A busy button keeps its accessible name and stays focusable, announcing
   * state via aria-busy. Replacing the label with a spinner would strand a
   * screen-reader user mid-action.
   */
  readonly busy?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', busy = false, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={`ns-button ns-button--${variant}`}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/* Text field                                                          */
/* ------------------------------------------------------------------ */

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  readonly id: string;
  readonly label: string;
  /** Persistent guidance. Wired via aria-describedby, not placeholder text. */
  readonly hint?: string;
  /**
   * Error text. Programmatically associated and announced; the field is never
   * marked invalid by colour alone (ENG-004).
   */
  readonly error?: string;
}

export function TextField({ id, label, hint, error, required, ...rest }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ns-field">
      <label className="ns-field__label" htmlFor={id}>
        {label}
        {required ? (
          <>
            {' '}
            <span aria-hidden="true">*</span>
            <VisuallyHidden>(required)</VisuallyHidden>
          </>
        ) : null}
      </label>
      {hint ? (
        <p className="ns-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      <input
        {...rest}
        id={id}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="ns-field__input"
      />
      {error ? (
        <p className="ns-field__error" id={errorId}>
          {/* The word "Error" carries the meaning; the colour only reinforces it. */}
          <VisuallyHidden>Error: </VisuallyHidden>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radio group                                                          */
/* ------------------------------------------------------------------ */

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface RadioGroupProps {
  readonly name: string;
  readonly legend: string;
  readonly options: readonly RadioOption[];
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly error?: string;
}

/**
 * A native radio group in a fieldset. Arrow-key navigation, grouping semantics
 * and the accessible name all come from the platform rather than from a
 * roving-tabindex implementation we would have to maintain.
 */
export function RadioGroup({ name, legend, options, value, onChange, error }: RadioGroupProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset className="ns-radio-group" aria-describedby={errorId} aria-invalid={error ? true : undefined}>
      <legend className="ns-radio-group__legend">{legend}</legend>
      {error ? (
        <p className="ns-field__error" id={errorId}>
          <VisuallyHidden>Error: </VisuallyHidden>
          {error}
        </p>
      ) : null}
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const descriptionId = option.description ? `${id}-description` : undefined;
        return (
          <div className="ns-radio" key={option.value}>
            <input
              type="radio"
              id={id}
              name={name}
              value={option.value}
              checked={value === option.value}
              aria-describedby={descriptionId}
              onChange={() => onChange?.(option.value)}
            />
            <label htmlFor={id}>{option.label}</label>
            {option.description ? (
              <p className="ns-radio__description" id={descriptionId}>
                {option.description}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                             */
/* ------------------------------------------------------------------ */

/**
 * Qualifier progress (PUB-001 / §7). The text label is the primary carrier;
 * the bar is decoration, so the information survives with images or CSS off.
 */
export function Progress({ current, total, label }: { current: number; total: number; label: string }) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal);
  return (
    <div className="ns-progress">
      <p className="ns-progress__label" id="ns-progress-label">
        {label}: step {safeCurrent} of {safeTotal}
      </p>
      <div
        className="ns-progress__track"
        role="progressbar"
        aria-labelledby="ns-progress-label"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
      >
        <div
          className="ns-progress__fill"
          style={{ inlineSize: `${(safeCurrent / safeTotal) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Disclosure                                                           */
/* ------------------------------------------------------------------ */

/** Native details/summary: keyboard, screen-reader and no-JS behaviour for free. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="ns-disclosure" open={defaultOpen}>
      <summary className="ns-disclosure__summary">{summary}</summary>
      <div className="ns-disclosure__content">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                               */
/* ------------------------------------------------------------------ */

export type StatusTone = 'critical' | 'warning' | 'success' | 'info';

const STATUS_MARK: Record<StatusTone, string> = {
  critical: '!',
  warning: '!',
  success: '✓',
  info: 'i',
};

/**
 * Status is carried by a text label first, a shape second and colour third
 * (PRD §14 "no colour-only status", ENG-004). The visible label is required —
 * there is no icon-only variant, deliberately.
 */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className={`ns-status ns-status--${tone}`}>
      <span className="ns-status__mark" aria-hidden="true">
        {STATUS_MARK[tone]}
      </span>
      <span className="ns-status__label">{children}</span>
    </span>
  );
}

/**
 * A polite live region for state changes such as "evidence saved".
 * `role="status"` rather than `alert`: PRD §15 asks for calm notifications.
 */
export function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="ns-status-message" role="status">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Notice band                                                          */
/* ------------------------------------------------------------------ */

export interface NoticeBandProps {
  readonly children: React.ReactNode;
  /** Source attribution is mandatory on any regulatory statement (PUB-004). */
  readonly sourceUrl: string;
  readonly sourceLabel: string;
  readonly lastReviewed: string;
  readonly onDismiss?: () => void;
  readonly dismissLabel?: string;
}

/**
 * The homepage notice band (PRD §7).
 *
 * Constraints from the PRD, all structural rather than stylistic: it must be
 * dismissible, must not flash, must not auto-scroll, and must show its source
 * and last-reviewed date. There is no timer and no animation in this component —
 * that is the point.
 */
export function NoticeBand({
  children,
  sourceUrl,
  sourceLabel,
  lastReviewed,
  onDismiss,
  dismissLabel = 'Dismiss this notice',
}: NoticeBandProps) {
  return (
    <aside className="ns-notice" aria-labelledby="ns-notice-heading">
      <h2 className="ns-visually-hidden" id="ns-notice-heading">
        Regulatory notice
      </h2>
      <div className="ns-notice__body">{children}</div>
      <p className="ns-notice__provenance">
        <a href={sourceUrl} rel="noreferrer">
          {sourceLabel}
        </a>
        {' · '}
        <span>Last reviewed {lastReviewed}</span>
      </p>
      {onDismiss ? (
        <Button variant="quiet" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      ) : null}
    </aside>
  );
}
