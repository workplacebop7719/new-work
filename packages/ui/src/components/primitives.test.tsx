/**
 * Component accessibility contracts (BRD-004).
 *
 * Each test states a behaviour the PRD requires, not an implementation detail,
 * so the tests survive a restyle and fail a regression.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoAxeViolations } from '@northstar/testing/a11y';
import {
  Button,
  Disclosure,
  NoticeBand,
  Progress,
  RadioGroup,
  SkipLink,
  StatusBadge,
  TextField,
} from './primitives';

describe('Button', () => {
  it('keeps its accessible name and stays focusable while busy', async () => {
    render(<Button busy>Save evidence</Button>);
    const button = screen.getByRole('button', { name: 'Save evidence' });
    expect(button).toHaveProperty('ariaBusy', 'true');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button')).toHaveProperty('type', 'button');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Button>Check your readiness</Button>);
    await expectNoAxeViolations(container);
  });
});

describe('TextField', () => {
  it('associates label, hint and error programmatically', () => {
    render(
      <TextField
        id="org-name"
        label="Organization name"
        hint="Use the legal name on your incorporation documents."
        error="Enter your organization name."
        required
      />,
    );
    const input = screen.getByLabelText(/Organization name/);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('org-name-hint');
    expect(describedBy).toContain('org-name-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('announces required state in text, not only with an asterisk', () => {
    render(<TextField id="a" label="Contact email" required />);
    expect(screen.getByText('(required)')).toBeDefined();
  });

  it('states the error in words so meaning survives without colour (ENG-004)', () => {
    render(<TextField id="b" label="Website" error="Enter a valid URL." />);
    expect(screen.getByText(/Enter a valid URL/).textContent).toContain('Error:');
  });

  it('has no axe violations', async () => {
    const { container } = render(<TextField id="c" label="Website" hint="Include https://" />);
    await expectNoAxeViolations(container);
  });
});

describe('RadioGroup', () => {
  const options = [
    { value: 'under_20', label: 'Fewer than 20 employees' },
    { value: '20_to_49', label: '20 to 49 employees' },
    { value: '50_to_199', label: '50 to 199 employees' },
    { value: '200_plus', label: '200 or more employees' },
  ];

  it('groups options under a legend', () => {
    render(<RadioGroup name="band" legend="How many employees?" options={options} />);
    expect(screen.getByRole('group', { name: 'How many employees?' })).toBeDefined();
  });

  it('is operable by keyboard alone (ACC-002)', async () => {
    const onChange = vi.fn();
    render(<RadioGroup name="band" legend="How many employees?" options={options} onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard('[ArrowDown]');
    expect(onChange).toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = render(<RadioGroup name="band" legend="How many employees?" options={options} />);
    await expectNoAxeViolations(container);
  });
});

describe('Progress', () => {
  it('states progress in text as well as in the bar', () => {
    render(<Progress current={3} total={8} label="Readiness qualifier" />);
    expect(screen.getByText(/step 3 of 8/)).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3');
  });

  it('clamps out-of-range values instead of rendering a broken bar', () => {
    render(<Progress current={99} total={8} label="Qualifier" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('8');
  });
});

describe('Disclosure', () => {
  it('uses native details/summary so it works without JavaScript', () => {
    const { container } = render(<Disclosure summary="What we will ask for">Evidence list</Disclosure>);
    expect(container.querySelector('details')).not.toBeNull();
    expect(container.querySelector('summary')).not.toBeNull();
  });
});

describe('StatusBadge', () => {
  it('always carries a visible text label (no colour-only status)', () => {
    render(<StatusBadge tone="critical">Critical</StatusBadge>);
    expect(screen.getByText('Critical')).toBeDefined();
  });

  it('hides the decorative mark from assistive technology', () => {
    const { container } = render(<StatusBadge tone="success">Retest passed</StatusBadge>);
    expect(container.querySelector('.ns-status__mark')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('NoticeBand (PRD §7)', () => {
  const props = {
    sourceUrl: 'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
    sourceLabel: 'Ontario — Completing your accessibility compliance report',
    lastReviewed: '18 August 2026',
  };

  it('shows its source and last-reviewed date (PUB-004)', () => {
    render(<NoticeBand {...props}>A reporting deadline applies to some organizations.</NoticeBand>);
    expect(screen.getByRole('link', { name: props.sourceLabel })).toBeDefined();
    expect(screen.getByText(/Last reviewed 18 August 2026/)).toBeDefined();
  });

  it('is dismissible by keyboard', async () => {
    const onDismiss = vi.fn();
    render(
      <NoticeBand {...props} onDismiss={onDismiss}>
        A reporting deadline applies to some organizations.
      </NoticeBand>,
    );
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard('[Enter]');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('contains no timer, animation or auto-scroll', () => {
    const { container } = render(<NoticeBand {...props}>Notice</NoticeBand>);
    const html = container.innerHTML;
    expect(html).not.toMatch(/animation|marquee|autoplay|scrollIntoView/i);
  });

  it('has no axe violations', async () => {
    const { container } = render(<NoticeBand {...props}>Notice text</NoticeBand>);
    await expectNoAxeViolations(container);
  });
});

describe('SkipLink', () => {
  it('points at the main landmark and remains in the tab order', () => {
    render(<SkipLink targetId="main">Skip to main content</SkipLink>);
    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link.getAttribute('href')).toBe('#main');
    link.focus();
    expect(document.activeElement).toBe(link);
  });
});

describe('NoticeBand on a held claim', () => {
  const base = {
    sourceUrl: 'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
    sourceLabel: 'Ontario — Completing your accessibility compliance report',
  };

  it('omits the last-reviewed clause rather than printing a placeholder', () => {
    render(<NoticeBand {...base}>This guidance is being reviewed.</NoticeBand>);
    expect(screen.queryByText(/Last reviewed/)).toBeNull();
    // The source is still offered, because that is what a reader needs while a
    // claim is on hold.
    expect(screen.getByRole('link', { name: base.sourceLabel })).toBeDefined();
  });
});
