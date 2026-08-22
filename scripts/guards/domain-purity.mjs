/**
 * ADR-0001 / ARC-002 — "/packages/domain: framework-independent ... rules" and
 * "vendor choices remain replaceable behind domain interfaces".
 *
 * The domain must compile with every adapter replaced by a fake. That property
 * is only true if the domain never imports a framework, a driver or an app, so
 * the dependency direction is checked rather than trusted.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const RULES = [
  {
    package: 'packages/domain',
    forbidden: [
      /from\s+['"]react/, /from\s+['"]next/, /from\s+['"]pg['"]/, /from\s+['"]@northstar\/(db|ui|auth|integrations|observability)/,
    ],
    why: 'the domain is framework- and vendor-independent',
  },
  {
    package: 'packages/auth',
    forbidden: [/from\s+['"]react/, /from\s+['"]next/, /from\s+['"]pg['"]/, /from\s+['"]@northstar\/(db|ui)/],
    why: 'authorization must be testable without a database, an IdP or a renderer (ENG-001)',
  },
  {
    package: 'packages/ui',
    forbidden: [/from\s+['"]pg['"]/, /from\s+['"]@northstar\/(db|integrations)/],
    why: 'the design system must not reach a datastore',
  },
  {
    package: 'packages/db',
    forbidden: [/from\s+['"]react/, /from\s+['"]next/, /from\s+['"]@northstar\/(ui|integrations)/],
    // The outbox worker needs a way to reach a vendor, and it takes one as a
    // parameter rather than importing one. Without this rule that injection
    // would erode the first time somebody found it inconvenient, and a database
    // package that performs HTTP cannot be tested without a network.
    why: 'the data layer must not import an adapter; the outbox takes its deliverer as a parameter (ARC-002)',
    // The admin CLIs are composition roots: `db:outbox` has to pick an adapter
    // somewhere, and a command that is never bundled into a request path is the
    // right place for it.
    exempt: /\/src\/cli\//,
  },
];

const failures = [];

for (const rule of RULES) {
  const files = await walk(`${ROOT}/${rule.package}/src`, (p) => /\.(ts|tsx)$/.test(p));
  for (const file of files) {
    // A composition root is allowed to know which adapter it composes.
    if (rule.exempt?.test(file)) continue;
    const text = await read(file);
    text.split('\n').forEach((line, index) => {
      for (const pattern of rule.forbidden) {
        if (pattern.test(line)) {
          failures.push(`${rel(file)}:${index + 1} forbidden import ${pattern} — ${rule.why}`);
        }
      }
    });
  }
}

process.exit(report('package dependency direction (ARC-002, ENG-001)', failures) ? 0 : 1);
