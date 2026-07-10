import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const { findSkillFiles, loadSkill } = await import(
  join(REPO, "scripts/lib/skills.mjs")
);

// install-unit-shape PR2 (ADR-4): the `storywright` router skill composes via
// body links to `references/*.md` instead of `composes:` frontmatter. This
// test independently mirrors the validator's reference-link integrity check
// (deliberately reimplemented, not imported, so the test does not merely
// exercise the implementation with itself) — every references/*.md file must
// be linked ≥1 time by SKILL.md or by another reference body, and the skill
// must link ≥1 reference overall.
test("the storywright skill links at least one reference, and no reference is orphaned", async () => {
  const files = await findSkillFiles();
  assert.equal(files.length, 1, "expected exactly one SKILL.md under skills/");
  const skill = await loadSkill(files[0]);
  const refDir = join(dirname(skill.path), "references");
  const refEntries = await readdir(refDir, { withFileTypes: true });
  const refNames = refEntries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => basename(e.name, ".md"));
  assert.ok(refNames.length > 0, "storywright skill should have ≥1 reference file");

  const bodies = [skill.body];
  for (const name of refNames) {
    bodies.push(await readFile(join(refDir, `${name}.md`), "utf8"));
  }
  const linked = new Set();
  for (const body of bodies) {
    for (const m of body.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) linked.add(m[1]);
    for (const m of body.matchAll(/references\/([a-z0-9-]+)\.md/g)) linked.add(m[1]);
  }

  assert.ok(linked.size > 0, "storywright skill should link ≥1 reference");
  for (const name of refNames) {
    assert.ok(
      linked.has(name),
      `references/${name}.md is orphaned — linked by no body`
    );
  }
});

// install-unit-shape PR2 (T4.6, design.md ADR-6 Tier 2 belt #2, DEF-009) —
// routing-fidelity: the router must dispatch to exactly the four intents,
// each story-producing intent's reference-loading list in the dispatch table
// must include all 11 references (dev.md audience preserved), and the
// canonical base hard-rules block must NOT be duplicated inline in the
// router (enforces ADR-3's no-inline rule + the DEF-009 line-budget signal —
// a leaked hard-rules block would blow the budget and re-introduce drift).
test("storywright router: routing-fidelity — dispatch table names all 4 intents, each lists all 11 references", async () => {
  const skill = await loadStorywrightSkill();
  const routingMatch = skill.body.match(/^### Routing[\s\S]*?(?=^## |^#### \w)/m);
  assert.ok(routingMatch, "router body must contain a '### Routing' dispatch section");
  const routingText = routingMatch[0];

  for (const intent of ["generate", "refine", "split", "batch"]) {
    assert.match(
      routingText,
      new RegExp(`\\|\\s*${intent}\\s*\\|`, "i"),
      `Routing dispatch table must name the '${intent}' intent`
    );
  }

  // "storywright-base" is written as the shorthand "base" in the dispatch
  // table's own prose ("Base is always read" below the table spells this
  // out) — check for the shorthand there, the full name everywhere else.
  const REFERENCE_NAMES = [
    "clarification-questions",
    "acceptance-criteria",
    "invest-checklist",
    "business-rules",
    "edge-cases",
    "analytics-events",
    "risks-and-dependencies",
    "definition-of-done",
    "story-formatter",
    "estimation",
  ];
  // The dispatch table rows for generate/refine/batch state "(same set as
  // generate)" rather than repeating the 11-name list — resolve that pointer
  // before asserting full coverage per row.
  const generateRow = routingText.match(/^\|.*\bgenerate\b.*\|$/m)?.[0] ?? "";
  const splitRow = routingText.match(/^\|.*\bsplit\b.*\|$/m)?.[0] ?? "";
  for (const row of [generateRow, splitRow]) {
    assert.match(row, /\bbase\b/, "reference-loading list must include the base rulebook ('base')");
    for (const name of REFERENCE_NAMES) {
      assert.ok(
        row.includes(name),
        `reference-loading list must include '${name}': ${row}`
      );
    }
  }
  assert.match(routingText, /same set as generate/, "refine/batch rows must point at the generate row's full reference set");

  assert.ok(
    !skill.body.includes("## Hard rules"),
    "router body must NOT inline the base hard-rules block (ADR-3 no-inline rule) — it must live only in references/storywright-base.md"
  );
});

test("every skill has a kebab-case name matching its folder", async () => {
  const files = await findSkillFiles();
  for (const f of files) {
    const s = await loadSkill(f);
    const folder = f.split("/").slice(-2, -1)[0];
    assert.equal(
      s.frontmatter.name,
      folder,
      `frontmatter name should match folder for ${s.relPath}`
    );
  }
});

test("every skill declares inputs and outputs", async () => {
  const files = await findSkillFiles();
  for (const f of files) {
    const s = await loadSkill(f);
    assert.ok(
      Array.isArray(s.frontmatter.inputs) && s.frontmatter.inputs.length > 0,
      `${s.relPath}: 'inputs' frontmatter should be a non-empty list`
    );
    assert.ok(
      Array.isArray(s.frontmatter.outputs) && s.frontmatter.outputs.length > 0,
      `${s.relPath}: 'outputs' frontmatter should be a non-empty list`
    );
  }
});

// P1.2 — every story-producing top-level skill must declare the standard + dev
// duo. Children/items use an `NN-<slug>.` prefix; the epic (now itself a
// standard/dev duo, `epic.standard.md` + `epic.dev.md`) / flow-summary.md /
// context are exempt. Catches output-contract drift (e.g. a skill stuck on
// 1-file output or regressing to a 3-file trio).
test("all story-producing skills declare the standard/dev duo", async () => {
  const files = await findSkillFiles();
  const SUFFIXES = ["standard.md", "dev.md"];
  for (const f of files) {
    const s = await loadSkill(f);
    const outputs = Array.isArray(s.frontmatter.outputs) ? s.frontmatter.outputs : [];
    const storyOutputs = outputs.filter((o) => /\.(standard|dev)\.md$/.test(o));
    for (const suffix of SUFFIXES) {
      assert.ok(
        storyOutputs.some((o) => o.endsWith(suffix)),
        `${s.relPath}: outputs must include a *.${suffix} file (duo parity)`
      );
    }
  }
});

// P2.1 — committed golden PM files must stay free of technical leakage
// (rule 3): no command-level DoD, no obvious file paths / imports. The dev
// file is exempt. Guards the PM↔dev separation against future regressions.
test("golden PM outputs carry no technical leakage", async () => {
  const dir = join(REPO, "examples/outputs/login-google");
  for (const pm of ["story.standard.md"]) {
    const text = await readFile(join(dir, pm), "utf8");
    for (const re of LEAK_PM) {
      assert.ok(!re.test(text), `${pm} leaks technical detail matching ${re}`);
    }
  }
  // The dev file SHOULD contain the technical detail.
  const dev = await readFile(join(dir, "story.dev.md"), "utf8");
  assert.match(dev, /npm run /, "story.dev.md should contain command-level DoD");
  assert.match(dev, /## Estimate/, "story.dev.md should contain ## Estimate");
});

// Helper: extract H2 heading text from markdown content.
function extractH2Sections(content) {
  return [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

// Shared PM-leakage constants — single source for every golden. Order matters:
// backlog-summary.md uses the first 5 LEAK entries and BANNED minus the last 2
// (a summary has no per-story Estimate section to ban).
const LEAK_PM = [
  /npm run /,
  /\bimport\b/,
  /\.(mjs|ts|tsx|jsx)\b/,
  /### Edge Cases/,
  /## Edge Cases/,
  /## Estimate/,
  /Story Points/,
];
const BANNED_PM = [
  "Edge Cases", "Non-Functional Requirements", "NFR", "Performance",
  "Security", "Accessibility", "Technical Considerations", "Analytics",
  "Risks", "Dependencies", "Dependencias", "Riesgos",
  "Estimate", "Story Points",
];

function assertNoPmLeakage(text, label, { leak = LEAK_PM, banned = BANNED_PM } = {}) {
  for (const re of leak) {
    assert.ok(!re.test(text), `${label} leaks technical detail matching ${re}`);
  }
  const sections = extractH2Sections(text);
  for (const b of banned) {
    assert.ok(
      !sections.some((s) => s.toLowerCase().startsWith(b.toLowerCase())),
      `Banned section found in ${label}: "${b}"`
    );
  }
}

// Pipe-table regex — deliberately NOT folded into the shared LEAK_PM array:
// backlog-summary.md (a roll-up) legitimately contains pipe tables (Dependency
// matrix, V audit, Backlog Estimate), so banning them pack-wide would break
// that golden's own shape. This regex is scoped to epic.standard.md only,
// where a leaked dependency-matrix table is the #1 stated leak risk (REQ-11.1)
// and no legitimate pipe table should ever appear in a PM file (rule 3 / the
// story-formatter "no pipe tables" rule already applies to story.standard.md;
// this closes the same gap for the epic PM file).
const PIPE_TABLE_RE = /^\s*\|.*\|/m;

// Positively assert the four REQ-01 epic PM sections exist (closes the
// vacuous-pass gap: a file with zero required sections and zero banned tokens
// would otherwise pass assertNoPmLeakage trivially).
const EPIC_PM_REQUIRED_SECTIONS = [
  "Objective / Hypothesis",
  "Business Outcome(s)",
  "In / Out of scope",
  "Core complexity",
];

function assertEpicPmShape(text, label) {
  assertNoPmLeakage(text, label);
  assert.ok(
    !PIPE_TABLE_RE.test(text),
    `${label} leaks a pipe table (dependency-matrix leak risk, REQ-11.1)`
  );
  const sections = extractH2Sections(text);
  for (const required of EPIC_PM_REQUIRED_SECTIONS) {
    assert.ok(
      sections.some((s) => s.toLowerCase() === required.toLowerCase()),
      `${label} must have the required H2 section "${required}" (REQ-01)`
    );
  }
}

// REQ-11.6 — the only mechanically-testable slice of "lightweight NOT full
// SAFe" (REQ-01 §2/§5). "Business-language only" / "1-3 sentence hypothesis"
// stay non-testable design prose, not asserted here.
const SAFE_APPARATUS_TOKENS = [
  /WSJF/i,
  /Portfolio Kanban/i,
  /Lean Business Case/i,
  /leading indicator/i,
  /funding/i,
  /go\/no-go/i,
];

// Child-naming pattern shared by split and batch goldens (REQ-05/REQ-11.3/.5).
const CHILD_NAME_RE = /^\d{2}-[a-z0-9-]+\.(standard|dev)\.md$/;
const STORY_N_RE = /story-\d/;

// story.standard.md must not contain any section from the Rule H banned list.
test('story.standard.md contains no banned sections', async () => {
  const content = await readFile(
    join(REPO, 'examples/outputs/login-google/story.standard.md'), 'utf8'
  );
  const sections = extractH2Sections(content);
  for (const b of BANNED_PM) {
    assert.ok(
      !sections.some(s => s.toLowerCase().startsWith(b.toLowerCase())),
      `Banned section found in PM golden: "${b}"`
    );
  }
});

// story.standard.md must contain the mandatory **Summary:** inline line.
test('story.standard.md contains Summary inline', async () => {
  const content = await readFile(
    join(REPO, 'examples/outputs/login-google/story.standard.md'), 'utf8'
  );
  assert.ok(
    content.includes('**Summary:**'),
    'story.standard.md must contain **Summary:** inline line'
  );
});

// Acceptance criteria must use the single AC-N scheme — never localized
// variants (CA-01, Criterio 1, Escenario 1). Guards the numbering-drift bug.
test('story.standard.md uses the AC-N numbering scheme only', async () => {
  const content = await readFile(
    join(REPO, 'examples/outputs/login-google/story.standard.md'), 'utf8'
  );
  assert.ok(
    /\*\*AC-\d+:/.test(content),
    'story.standard.md must label acceptance criteria as **AC-N:**'
  );
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const re of FORBIDDEN_AC_LABELS) {
    assert.ok(
      !re.test(content),
      `story.standard.md uses a forbidden AC label matching ${re}`
    );
  }
});

// The title heading must be the bare story name — no story/sequence-number
// prefix (Historia 00 —, Story 3:, HU-01 -). Guards the title-prefix bug.
test('story.standard.md title carries no story-number prefix', async () => {
  const content = await readFile(
    join(REPO, 'examples/outputs/login-google/story.standard.md'), 'utf8'
  );
  const title = content.match(/^# (.+)$/m)?.[1] ?? '';
  assert.ok(
    !/^(historia|story|hu|us)\s*[-–—:]?\s*\d+/i.test(title.trim()),
    `story.standard.md title must not be prefixed with a story number: "${title}"`
  );
});

// ── story-batch golden fixture tests ─────────────────────────────────────────
// These tests assert the shape of committed golden outputs for story-batch.
// The golden lives at examples/outputs/backlog-grooming/ and is regenerated to
// the NN-<slug> convention (epic-first-class) — items are named
// 01-resumen-carrito-pagar / 02-codigo-descuento-checkout. The golden exists
// now and the shape is strict — no directory-absent skip guard.

const BATCH_GOLDEN = join(REPO, "examples/outputs/backlog-grooming");
const BATCH_ITEMS = ["01-resumen-carrito-pagar", "02-codigo-descuento-checkout"];

// (a) Duo parity: both batch items have both suffixes; no third pair exists
// (the "story-3 must not exist" SPLIT-RECOMMENDED intent, generalized to
// "no 03-* child pair exists" under the new naming).
test("story-batch: duo parity for items 1–2 in golden, no 03-* pair", async () => {
  const SUFFIXES = ["standard.md", "dev.md"];
  for (const item of BATCH_ITEMS) {
    for (const suffix of SUFFIXES) {
      await stat(join(BATCH_GOLDEN, `${item}.${suffix}`));
    }
  }
  // Item 3 (payment flow) is SPLIT RECOMMENDED — no 03-* files should exist.
  const entries = await readdir(BATCH_GOLDEN);
  assert.ok(
    !entries.some((e) => /^03-/.test(e)),
    "no 03-* child pair must exist (item 3 is SPLIT RECOMMENDED)"
  );
});

// (b) PM leakage per item: standard.md passes LEAK regex; dev.md matches /npm run /.
test("story-batch: PM files carry no technical leakage", async () => {
  for (const item of BATCH_ITEMS) {
    const text = await readFile(join(BATCH_GOLDEN, `${item}.standard.md`), "utf8");
    for (const re of LEAK_PM) {
      assert.ok(!re.test(text), `${item}.standard.md leaks technical detail matching ${re}`);
    }
    const dev = await readFile(join(BATCH_GOLDEN, `${item}.dev.md`), "utf8");
    assert.match(dev, /npm run /, `${item}.dev.md should contain command-level DoD`);
  }
});

// (c) backlog-summary.md: no LEAK, no BANNED H2, contains **Cohesion:**, contains ## Dependency matrix.
test("story-batch: backlog-summary.md shape", async () => {
  const text = await readFile(join(BATCH_GOLDEN, "backlog-summary.md"), "utf8");
  // A summary aggregates stories: no per-story Estimate section exists to ban.
  assertNoPmLeakage(text, "backlog-summary.md", {
    leak: LEAK_PM.slice(0, 5),
    banned: BANNED_PM.slice(0, -2),
  });
  const sections = extractH2Sections(text);
  assert.ok(
    text.includes("**Cohesion:**"),
    "backlog-summary.md must contain **Cohesion:** line"
  );
  assert.ok(
    sections.some((s) => s.toLowerCase().startsWith("dependency matrix")),
    "backlog-summary.md must contain ## Dependency matrix section"
  );
});

// (d) AC-N scheme in the first batch item.
test("story-batch: 01-resumen-carrito-pagar.standard.md uses AC-N numbering scheme", async () => {
  const content = await readFile(join(BATCH_GOLDEN, "01-resumen-carrito-pagar.standard.md"), "utf8");
  assert.ok(
    /\*\*AC-\d+:/.test(content),
    "01-resumen-carrito-pagar.standard.md must label acceptance criteria as **AC-N:**"
  );
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const re of FORBIDDEN_AC_LABELS) {
    assert.ok(
      !re.test(content),
      `01-resumen-carrito-pagar.standard.md uses a forbidden AC label matching ${re}`
    );
  }
});

// (e) No story-number title prefix in the first batch item.
test("story-batch: 01-resumen-carrito-pagar.standard.md title carries no story-number prefix", async () => {
  const content = await readFile(join(BATCH_GOLDEN, "01-resumen-carrito-pagar.standard.md"), "utf8");
  const title = content.match(/^# (.+)$/m)?.[1] ?? "";
  assert.ok(
    !/^(historia|story|hu|us)\s*[-–—:]?\s*\d+/i.test(title.trim()),
    `01-resumen-carrito-pagar.standard.md title must not be prefixed with a story number: "${title}"`
  );
});

// (f) **Summary:** inline in the first batch item.
test("story-batch: 01-resumen-carrito-pagar.standard.md contains Summary inline", async () => {
  const content = await readFile(join(BATCH_GOLDEN, "01-resumen-carrito-pagar.standard.md"), "utf8");
  assert.ok(
    content.includes("**Summary:**"),
    "01-resumen-carrito-pagar.standard.md must contain **Summary:** inline line"
  );
});

// (g) Batch-naming parity (REQ-11.5, strict — the batch golden is now
// regenerated to the NN-<slug> shape, so this assertion matches the split
// golden's strictness with no existence guard).
test("story-batch: item filenames match NN-<slug> naming, none match story-\\d", async () => {
  const entries = await readdir(BATCH_GOLDEN);
  const childFiles = entries.filter((e) => /\.(standard|dev)\.md$/.test(e));
  assert.ok(childFiles.length > 0, "batch golden must contain at least one child file");
  for (const file of childFiles) {
    assert.match(file, CHILD_NAME_RE, `${file} must match ^\\d{2}-[a-z0-9-]+\\.(standard|dev)\\.md$`);
    assert.ok(!STORY_N_RE.test(file), `${file} must not match story-\\d`);
  }
});

// ── story-refine amendment mode ──────────────────────────────────────────────
// These tests assert the shape of the Amendment mode addition, now living
// inside the single storywright router's `#### refine` delta subsection
// (install-unit-shape PR2, design.md "Test-suite migration" — the router's
// `## Application` section now carries all four intents, so the Step R
// assertions must scope to the `#### refine` subsection specifically, not
// the whole `## Application` section).

async function loadStorywrightSkill() {
  const files = await findSkillFiles();
  const path = files.find((f) => f.includes("storywright/SKILL.md"));
  assert.ok(path, "skills/storywright/SKILL.md not found");
  return loadSkill(path);
}

// Extract the `#### refine` delta subsection body: from its own heading up
// to (not including) the next `#### <intent>` heading.
function extractRefineSubsection(body) {
  const match = body.match(/^#### refine\n([\s\S]*?)(?=^#### \w|^## )/m);
  assert.ok(match, "router body must contain a '#### refine' delta subsection");
  return match[1];
}

// (T4.1) trigger frontmatter must carry the 5 pre-existing plain-refine
// phrases AND the 5 amendment phrases (spec R1 scenario 1.1), now on the
// single router's trigger union.
test("storywright router: trigger frontmatter carries plain-refine and amendment phrases", async () => {
  const skill = await loadStorywrightSkill();
  const trigger = skill.frontmatter.trigger ?? "";
  const PLAIN_REFINE_PHRASES = [
    "/story-refine",
    "refine this story",
    "improve this story",
    "refinar historia",
    "this story is incomplete",
  ];
  const AMENDMENT_PHRASES = [
    "I forgot to mention",
    "add this to the story",
    "one more requirement",
    "me olvidé de mencionar",
    "agregale a la historia",
  ];
  for (const phrase of [...PLAIN_REFINE_PHRASES, ...AMENDMENT_PHRASES]) {
    assert.ok(
      trigger.includes(phrase),
      `storywright router trigger frontmatter missing phrase: "${phrase}"`
    );
  }
});

// (T4.1 / R2 scenario 2.4) a numbered amendment-detection step (Step R) must
// exist in the router's `#### refine` delta subsection, distinguishable from
// the "Amendment differential" prose section header, and it must precede
// references to base steps 2+. R2 also mandates the classification rule
// itself be STATED in this numbered step (not just referenced) — assert the
// two-path predicate and all three accepted existing-story sources are
// present in the step's own text, and that the step appears before any
// reference to base steps 5/7/11.
test("storywright router: numbered amendment-detection step exists in the refine subsection", async () => {
  const skill = await loadStorywrightSkill();
  const refineSubsection = extractRefineSubsection(skill.body);
  assert.match(
    refineSubsection,
    /^\d+\.\s.*Step R.*[Aa]mendment/m,
    "refine subsection must contain a numbered detection-step line referencing Step R / amendment"
  );
  const stepRMatch = refineSubsection.match(/^\d+\.\s.*Step R[\s\S]*?(?=\n- Step \d|\n\d+\.\s|$)/m);
  assert.ok(stepRMatch, "Step R numbered entry must be extractable from the refine subsection");
  const stepRText = stepRMatch[0];
  assert.match(
    stepRText,
    /Amendment.{0,40}Plain refine|Plain refine.{0,40}Amendment/s,
    "Step R must state the two-path predicate (Amendment vs Plain refine) in its own text, not by reference"
  );
  assert.match(
    stepRText,
    /pasted as text/i,
    "Step R must enumerate story source (a): existing story pasted as text"
  );
  assert.match(
    stepRText,
    /story\.standard\.md.*story\.dev\.md|story\.dev\.md.*story\.standard\.md/,
    "Step R must enumerate story source (b): a prior story.standard.md/story.dev.md pair"
  );
  assert.match(
    stepRText,
    /\.storywright-context\.json/,
    "Step R must enumerate story source (c): a reference resolvable via .storywright-context.json"
  );
  const stepRIndex = refineSubsection.indexOf(stepRText);
  for (const laterRef of [/Step 5/, /Step 7/, /Step 11/]) {
    const m = refineSubsection.match(laterRef);
    if (m) {
      assert.ok(
        m.index > stepRIndex,
        `Step R must precede references to base steps 2+ (found "${laterRef}" before Step R)`
      );
    }
  }
});

// (T4.2 / R3 scenario 3.2, R6 scenario 6.2, D6) amendment golden — no PM
// leakage, AC append-not-renumber. The golden ships in this same change, so
// these assertions run unconditionally — a missing golden fails loudly
// instead of being silently skipped.

const AMENDMENT_GOLDEN = join(REPO, "examples/outputs/story-refine-amendment");

test("story-refine-amendment golden: PM file carries no technical leakage", async () => {
  const text = await readFile(join(AMENDMENT_GOLDEN, "story.standard.md"), "utf8");
  assertNoPmLeakage(text, "amendment golden story.standard.md");
});

test("story-refine-amendment golden: AC-N scheme, append-not-renumber", async () => {
  const content = await readFile(join(AMENDMENT_GOLDEN, "story.standard.md"), "utf8");
  assert.ok(
    /\*\*AC-\d+:/.test(content),
    "story.standard.md must label acceptance criteria as **AC-N:**"
  );
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const re of FORBIDDEN_AC_LABELS) {
    assert.ok(
      !re.test(content),
      `story.standard.md uses a forbidden AC label matching ${re}`
    );
  }
  const acNumbers = [...content.matchAll(/\*\*AC-(\d+):/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  assert.deepEqual(
    acNumbers,
    [1, 2, 3],
    "amendment golden must show AC-1 and AC-2 preserved plus AC-3 appended, no gap, no duplicate"
  );
  const unique = new Set(acNumbers);
  assert.equal(unique.size, acNumbers.length, "AC numbers must not repeat");
});

test("story-refine-amendment golden: dev file carries technical detail and Estimate", async () => {
  const dev = await readFile(join(AMENDMENT_GOLDEN, "story.dev.md"), "utf8");
  assert.match(dev, /npm run /, "story.dev.md should contain command-level DoD");
  assert.match(dev, /## Estimate/, "story.dev.md should contain ## Estimate");
});

// (R6 scenarios 6.1/6.2) the amendment Refinement log must carry the amendment
// marker with a one-line delta summary and the estimate-change note, and stay
// within the ≤3-line ceiling (no SPLIT verdict in this golden).
test("story-refine-amendment golden: Refinement log records amendment within the line ceiling", async () => {
  const dev = await readFile(join(AMENDMENT_GOLDEN, "story.dev.md"), "utf8");
  const logMatch = dev.match(/\*Refinement log\*\n([\s\S]*)$/);
  assert.ok(logMatch, "story.dev.md must contain a *Refinement log* block");
  const logLines = logMatch[1].trim().split("\n").filter((l) => l.trim().length > 0);
  assert.ok(
    logLines.length <= 3,
    `Refinement log must stay within the ≤3-line ceiling (found ${logLines.length})`
  );
  assert.match(
    logMatch[1],
    /Amendment:/,
    "Refinement log must contain the amendment marker line with the delta summary"
  );
  assert.match(
    logMatch[1],
    /no conflict/i,
    "Refinement log must record explicit conflict status (no conflict, in this golden)"
  );
  assert.match(
    logMatch[1],
    /Estimate:/i,
    "Refinement log must record the estimate note"
  );
});

// (R4 scenarios 4.1–4.3) conflict-path golden — the user-declared delta
// contradicts an existing AC's Given. One BLOCKING question raised via the
// host's interactive clarification mechanism (e.g. AskUserQuestion on Claude
// Code) resolves it; only the contradicted AC changes, the independent AC
// survives byte-identical, and the Refinement log records the conflict +
// resolution.
// No directory-exists guard — a missing golden fails loudly, consistent with
// the amendment-golden tests above.

const CONFLICT_GOLDEN = join(REPO, "examples/outputs/story-refine-amendment-conflict");

test("story-refine-amendment-conflict golden: PM file carries no technical leakage", async () => {
  const text = await readFile(join(CONFLICT_GOLDEN, "story.standard.md"), "utf8");
  assertNoPmLeakage(text, "conflict golden story.standard.md");
});

test("story-refine-amendment-conflict golden: AC numbering unchanged, no renumbering", async () => {
  const content = await readFile(join(CONFLICT_GOLDEN, "story.standard.md"), "utf8");
  assert.ok(
    /\*\*AC-\d+:/.test(content),
    "story.standard.md must label acceptance criteria as **AC-N:**"
  );
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const re of FORBIDDEN_AC_LABELS) {
    assert.ok(
      !re.test(content),
      `story.standard.md uses a forbidden AC label matching ${re}`
    );
  }
  const acNumbers = [...content.matchAll(/\*\*AC-(\d+):/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  assert.deepEqual(
    acNumbers,
    [1, 2],
    "conflict golden must show exactly AC-1 (resolved) and AC-2 (untouched) — a conflict resolves existing content, it does not append a new AC"
  );
});

test("story-refine-amendment-conflict golden: Refinement log records conflict marker and resolution", async () => {
  const dev = await readFile(join(CONFLICT_GOLDEN, "story.dev.md"), "utf8");
  assert.match(dev, /npm run /, "story.dev.md should contain command-level DoD");
  assert.match(dev, /## Estimate/, "story.dev.md should contain ## Estimate");
  const logMatch = dev.match(/\*Refinement log\*\n([\s\S]*)$/);
  assert.ok(logMatch, "story.dev.md must contain a *Refinement log* block");
  const logLines = logMatch[1].trim().split("\n").filter((l) => l.trim().length > 0);
  assert.ok(
    logLines.length <= 3,
    `Refinement log must stay within the ≤3-line ceiling (found ${logLines.length})`
  );
  assert.match(
    logMatch[1],
    /Amendment:/,
    "Refinement log must contain the amendment marker line with the delta summary"
  );
  assert.match(
    logMatch[1],
    /Conflict:/i,
    "Refinement log must contain a conflict marker line"
  );
  assert.match(
    logMatch[1],
    /resolved|resolution|supersedes/i,
    "Refinement log conflict line must record the resolution"
  );
  assert.match(
    logMatch[1],
    /Estimate:/i,
    "Refinement log must record the estimate note"
  );
});

// Axis-2 (clarification-mechanism spec) maintain-functionality invariant:
// the agnostic-with-example rewording must keep the literal `AskUserQuestion`
// token present as the parenthetical example at every site that named it as
// the clarification mechanism, so Claude Code still receives the signal to
// fire its interactive widget. Every file below had ≥1 occurrence before the
// rewording (portability-level-b, Phase 6) and must retain ≥1 after it.
// install-unit-shape PR2 (T4.7): the 4 per-skill SKILL.md paths + the
// _components base path collapse to the single router path + its relocated
// base reference. The pack ships no slash-command wrappers anymore — intent
// is auto-detected by the router (and can be pinned inline via an explicit
// "Intent: X" instruction), so the only sites that must carry the token are
// the router and its base reference.
const ASK_USER_QUESTION_SITES = [
  "skills/storywright/SKILL.md",
  "skills/storywright/references/storywright-base.md",
];

test("AskUserQuestion signal token survives the agnostic-with-example rewording", async () => {
  for (const relPath of ASK_USER_QUESTION_SITES) {
    const content = await readFile(join(REPO, relPath), "utf8");
    assert.ok(
      /AskUserQuestion/.test(content),
      `${relPath} must retain the literal AskUserQuestion token (Claude tool-activation signal)`
    );
  }
});

// ── story-split golden fixture tests ─────────────────────────────────────────
// The golden lives at examples/outputs/story-split-oversized/ (epic duo —
// epic.standard.md + epic.dev.md — plus one NN-<slug> duo per child:
// 01-ver-filtrar-dashboard.{standard,dev}.md, 02-buscar-dashboard.{standard,
// dev}.md). The epic is retired as a single epic.md file (epic-first-class) —
// it is now itself a PM↔dev duo like every story, so it gets the SAME
// no-leakage guard as the children's PM files, not a lesser exemption.

const SPLIT_GOLDEN = join(REPO, "examples/outputs/story-split-oversized");
const SPLIT_CHILDREN = ["01-ver-filtrar-dashboard", "02-buscar-dashboard"];

// REQ-11.1 — strengthened: pipe-table regex + positive required-section
// assertion, closing the vacuous-pass gap where zero-banned-tokens +
// zero-required-sections would otherwise pass green.
test("story-split-oversized golden: epic.standard.md and both PM files carry no technical leakage", async () => {
  const epicStandard = await readFile(join(SPLIT_GOLDEN, "epic.standard.md"), "utf8");
  assertEpicPmShape(epicStandard, "split golden epic.standard.md");
  for (const child of SPLIT_CHILDREN) {
    const text = await readFile(join(SPLIT_GOLDEN, `${child}.standard.md`), "utf8");
    assertNoPmLeakage(text, `split golden ${child}.standard.md`);
  }
});

// REQ-04c (split-determinism) — epic.standard.md must contain the mandatory
// **Summary:** inline line, mirroring the story-Summary assertion above
// (~L278). Fails if the line is absent, guarding against the golden silently
// regressing to no Summary (which is what it shipped with before this fix).
test("story-split-oversized golden: epic.standard.md contains Summary inline", async () => {
  const content = await readFile(join(SPLIT_GOLDEN, "epic.standard.md"), "utf8");
  assert.ok(
    content.includes("**Summary:**"),
    "epic.standard.md must contain **Summary:** inline line"
  );
});

// Permitted companion (REQ-04c) — epic.dev.md carries the same mandate per
// base step 8's "both output files" wording, now reconciled to cover the
// epic duo explicitly.
test("story-split-oversized golden: epic.dev.md contains Summary inline", async () => {
  const content = await readFile(join(SPLIT_GOLDEN, "epic.dev.md"), "utf8");
  assert.ok(
    content.includes("**Summary:**"),
    "epic.dev.md must contain **Summary:** inline line"
  );
});

// REQ-11.2 — epic duo present, no bare epic.md.
test("story-split-oversized golden: epic duo present, no bare epic.md", async () => {
  await stat(join(SPLIT_GOLDEN, "epic.standard.md"));
  await stat(join(SPLIT_GOLDEN, "epic.dev.md"));
  let bareEpicExists = false;
  try {
    await stat(join(SPLIT_GOLDEN, "epic.md"));
    bareEpicExists = true;
  } catch { /* expected */ }
  assert.ok(!bareEpicExists, "epic.md must not exist — replaced by the epic.standard.md/epic.dev.md duo");
});

// REQ-11.3 — child naming: NN-<slug> pattern, no story-\d.
test("story-split-oversized golden: child files match NN-<slug> naming, none match story-\\d", async () => {
  const entries = await readdir(SPLIT_GOLDEN);
  const childFiles = entries.filter((e) => /\.(standard|dev)\.md$/.test(e) && !e.startsWith("epic."));
  assert.ok(childFiles.length > 0, "split golden must contain at least one child file");
  for (const file of childFiles) {
    assert.match(file, CHILD_NAME_RE, `${file} must match ^\\d{2}-[a-z0-9-]+\\.(standard|dev)\\.md$`);
    assert.ok(!STORY_N_RE.test(file), `${file} must not match story-\\d`);
  }
});

test("story-split-oversized golden: children use AC-N numbering scheme", async () => {
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const child of SPLIT_CHILDREN) {
    const content = await readFile(join(SPLIT_GOLDEN, `${child}.standard.md`), "utf8");
    assert.ok(
      /\*\*AC-\d+:/.test(content),
      `${child}.standard.md must label acceptance criteria as **AC-N:**`
    );
    for (const re of FORBIDDEN_AC_LABELS) {
      assert.ok(
        !re.test(content),
        `${child}.standard.md uses a forbidden AC label matching ${re}`
      );
    }
    const acNumbers = [...content.matchAll(/\*\*AC-(\d+):/g)]
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    assert.deepEqual(
      acNumbers,
      [1],
      `split children carry a single AC-1 each (split narrows scope to one flow per child); ${child}.standard.md found ${JSON.stringify(acNumbers)}`
    );
  }
});

test("story-split-oversized golden: children dev files carry technical detail and Estimate", async () => {
  for (const child of SPLIT_CHILDREN) {
    const dev = await readFile(join(SPLIT_GOLDEN, `${child}.dev.md`), "utf8");
    assert.match(dev, /npm run /, `${child}.dev.md should contain command-level DoD`);
    assert.match(dev, /## Estimate/, `${child}.dev.md should contain ## Estimate`);
  }
});

// REQ-11.4 — Assumed-outcome banner, scoped to the Business Outcome(s)
// section body (not a bare whole-file substring check).
test("story-split-oversized golden: epic.standard.md Business Outcome(s) section carries the Assumed banner", async () => {
  const epicStandard = await readFile(join(SPLIT_GOLDEN, "epic.standard.md"), "utf8");
  const sections = extractH2Sections(epicStandard);
  const outcomeHeading = sections.find((s) => s.toLowerCase().startsWith("business outcome"));
  assert.ok(outcomeHeading, "epic.standard.md must have a Business Outcome(s) H2 section");
  const sectionMatch = epicStandard.match(
    new RegExp(`^## ${outcomeHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m")
  );
  assert.ok(sectionMatch, "Business Outcome(s) section body must be extractable");
  assert.match(
    sectionMatch[1],
    /⚠️ Assumed:/,
    "Business Outcome(s) section body must contain the ⚠️ Assumed: marker"
  );
});

// REQ-11.6 — no full-SAFe vocabulary creep (NEW). The only mechanically
// testable slice of "lightweight NOT full SAFe" (REQ-01 §2/§5).
test("story-split-oversized golden: epic.standard.md contains no SAFe-apparatus tokens", async () => {
  const epicStandard = await readFile(join(SPLIT_GOLDEN, "epic.standard.md"), "utf8");
  for (const re of SAFE_APPARATUS_TOKENS) {
    assert.ok(!re.test(epicStandard), `epic.standard.md must not contain a SAFe-apparatus token matching ${re}`);
  }
});

// REQ-03 — dev↔value bridge: epic.dev.md references children by NN-<slug>
// identifier (or stable ordinal), never "Story 1"/"Story 2".
test("story-split-oversized golden: epic.dev.md references children by NN-<slug>, not Story N", async () => {
  const epicDev = await readFile(join(SPLIT_GOLDEN, "epic.dev.md"), "utf8");
  assert.ok(
    !/\bStory\s+[12]\b/.test(epicDev),
    "epic.dev.md must not reference children as 'Story 1'/'Story 2' — use NN-<slug> identifiers"
  );
  for (const child of SPLIT_CHILDREN) {
    assert.ok(
      epicDev.includes(child),
      `epic.dev.md must reference child "${child}" by its NN-<slug> identifier`
    );
  }
  assert.match(
    epicDev,
    /moves Outcome/i,
    "epic.dev.md dev↔value bridge must reference a Business Outcome by identifier (e.g. 'moves Outcome A')"
  );
});
