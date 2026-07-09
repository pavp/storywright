import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const { findSkillFiles, loadSkill } = await import(
  join(REPO, "scripts/lib/skills.mjs")
);

test("all top-level skills compose at least one component", async () => {
  const files = await findSkillFiles();
  const topLevel = [];
  for (const f of files) {
    const s = await loadSkill(f);
    if (!s.relPath.includes("_components/")) topLevel.push(s);
  }
  for (const s of topLevel) {
    const composes = Array.isArray(s.frontmatter.composes)
      ? s.frontmatter.composes
      : [];
    assert.ok(
      composes.length > 0,
      `top-level skill '${s.frontmatter.name}' should compose ≥1 component`
    );
  }
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
// duo. Children/flows use a `story-<N>.` prefix; epic.md / flow-summary.md /
// context are exempt. Catches output-contract drift (e.g. a skill stuck on
// 1-file output or regressing to a 3-file trio).
test("all story-producing skills declare the standard/dev duo", async () => {
  const files = await findSkillFiles();
  const SUFFIXES = ["standard.md", "dev.md"];
  for (const f of files) {
    const s = await loadSkill(f);
    if (s.relPath.includes("_components/")) continue;
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
  const dir = join(REPO, "examples/outputs/google-login");
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

// story.standard.md must not contain any section from the Rule H banned list.
test('story.standard.md contains no banned sections', async () => {
  const content = await readFile(
    join(REPO, 'examples/outputs/google-login/story.standard.md'), 'utf8'
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
    join(REPO, 'examples/outputs/google-login/story.standard.md'), 'utf8'
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
    join(REPO, 'examples/outputs/google-login/story.standard.md'), 'utf8'
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
    join(REPO, 'examples/outputs/google-login/story.standard.md'), 'utf8'
  );
  const title = content.match(/^# (.+)$/m)?.[1] ?? '';
  assert.ok(
    !/^(historia|story|hu|us)\s*[-–—:]?\s*\d+/i.test(title.trim()),
    `story.standard.md title must not be prefixed with a story number: "${title}"`
  );
});

// ── story-batch golden fixture tests ─────────────────────────────────────────
// These tests assert the shape of committed golden outputs for story-batch.
// The golden lives at examples/outputs/backlog-grooming/ and is delivered in PR2.
// All assertions here compile and are registered now; assertions that reference
// the golden directory will be skipped (not fail) when the directory is absent,
// so the test suite passes in PR1 and enforces shape in PR2+.
//
// Known-failing-until-PR2: assertions (a)–(f) below all depend on the golden
// directory existing. They are skipped (directory-absent guard) until PR2 lands.

const BATCH_GOLDEN = join(REPO, "examples/outputs/backlog-grooming");

async function batchGoldenExists() {
  try {
    await stat(BATCH_GOLDEN);
    return true;
  } catch {
    return false;
  }
}

// (a) Duo parity: story-1 and story-2 have both suffixes; story-3 has none.
test("story-batch: duo parity for items 1–3 in golden", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
  const SUFFIXES = ["standard.md", "dev.md"];
  for (const n of [1, 2]) {
    for (const suffix of SUFFIXES) {
      await stat(join(BATCH_GOLDEN, `story-${n}.${suffix}`));
    }
  }
  // story-3 is SPLIT RECOMMENDED — no files should exist
  for (const suffix of SUFFIXES) {
    let exists = false;
    try {
      await stat(join(BATCH_GOLDEN, `story-3.${suffix}`));
      exists = true;
    } catch { /* expected */ }
    assert.ok(!exists, `story-3.${suffix} must not exist (item is SPLIT RECOMMENDED)`);
  }
});

// (b) PM leakage per story: standard.md passes LEAK regex; dev.md matches /npm run /.
test("story-batch: PM files carry no technical leakage", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
  for (const n of [1, 2]) {
    for (const pm of [`story-${n}.standard.md`]) {
      const text = await readFile(join(BATCH_GOLDEN, pm), "utf8");
      for (const re of LEAK_PM) {
        assert.ok(!re.test(text), `${pm} leaks technical detail matching ${re}`);
      }
    }
    const dev = await readFile(join(BATCH_GOLDEN, `story-${n}.dev.md`), "utf8");
    assert.match(dev, /npm run /, `story-${n}.dev.md should contain command-level DoD`);
  }
});

// (c) backlog-summary.md: no LEAK, no BANNED H2, contains **Cohesion:**, contains ## Dependency matrix.
test("story-batch: backlog-summary.md shape", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
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

// (d) AC-N scheme in story-1.standard.md.
test("story-batch: story-1.standard.md uses AC-N numbering scheme", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
  const content = await readFile(join(BATCH_GOLDEN, "story-1.standard.md"), "utf8");
  assert.ok(
    /\*\*AC-\d+:/.test(content),
    "story-1.standard.md must label acceptance criteria as **AC-N:**"
  );
  const FORBIDDEN_AC_LABELS = [/\bCA-\d/, /\bCriterio\s+\d/i, /\bEscenario\s+\d/i];
  for (const re of FORBIDDEN_AC_LABELS) {
    assert.ok(
      !re.test(content),
      `story-1.standard.md uses a forbidden AC label matching ${re}`
    );
  }
});

// (e) No story-number title prefix in story-1.standard.md.
test("story-batch: story-1.standard.md title carries no story-number prefix", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
  const content = await readFile(join(BATCH_GOLDEN, "story-1.standard.md"), "utf8");
  const title = content.match(/^# (.+)$/m)?.[1] ?? "";
  assert.ok(
    !/^(historia|story|hu|us)\s*[-–—:]?\s*\d+/i.test(title.trim()),
    `story-1.standard.md title must not be prefixed with a story number: "${title}"`
  );
});

// (f) **Summary:** inline in story-1.standard.md.
test("story-batch: story-1.standard.md contains Summary inline", async () => {
  if (!(await batchGoldenExists())) return; // skip until PR2
  const content = await readFile(join(BATCH_GOLDEN, "story-1.standard.md"), "utf8");
  assert.ok(
    content.includes("**Summary:**"),
    "story-1.standard.md must contain **Summary:** inline line"
  );
});

// ── story-refine amendment mode ──────────────────────────────────────────────
// These tests assert the shape of the Amendment mode addition to story-refine
// (spec R1/R2, tasks T4.1/T4.2). The trigger-phrase and detection-step tests
// run against the skill file directly, independent of the golden.

async function loadStoryRefineSkill() {
  const files = await findSkillFiles();
  const path = files.find((f) => f.includes("story-refine/SKILL.md"));
  assert.ok(path, "skills/story-refine/SKILL.md not found");
  return loadSkill(path);
}

// (T4.1) trigger frontmatter must carry the 5 pre-existing plain-refine
// phrases AND the 5 new amendment phrases (spec R1 scenario 1.1).
test("story-refine: trigger frontmatter carries plain-refine and amendment phrases", async () => {
  const skill = await loadStoryRefineSkill();
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
      `story-refine trigger frontmatter missing phrase: "${phrase}"`
    );
  }
});

// (T4.1 / R2 scenario 2.4) a numbered amendment-detection step (Step R) must
// exist in the Application section, distinguishable from the "Amendment
// differential" prose section header, and it must precede references to base
// steps 2+. R2 also mandates the classification rule itself be STATED in this
// numbered step (not just referenced) — assert the two-path predicate and all
// three accepted existing-story sources are present in the step's own text,
// and that the step appears before any reference to base steps 5/7/11.
test("story-refine: numbered amendment-detection step exists in Application section", async () => {
  const skill = await loadStoryRefineSkill();
  const applicationSection = skill.body.split(/^## Application/m)[1] ?? "";
  assert.match(
    applicationSection,
    /^\d+\.\s.*Step R.*[Aa]mendment/m,
    "Application section must contain a numbered detection-step line referencing Step R / amendment"
  );
  const stepRMatch = applicationSection.match(/^\d+\.\s.*Step R[\s\S]*?(?=\n- Step \d|\n\d+\.\s|$)/m);
  assert.ok(stepRMatch, "Step R numbered entry must be extractable from the Application section");
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
  const stepRIndex = applicationSection.indexOf(stepRText);
  for (const laterRef of [/Step 5/, /Step 7/, /Step 11/]) {
    const m = applicationSection.match(laterRef);
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
// contradicts an existing AC's Given. One BLOCKING AskUserQuestion resolves
// it; only the contradicted AC changes, the independent AC survives
// byte-identical, and the Refinement log records the conflict + resolution.
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
