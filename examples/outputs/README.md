# Example outputs

Real, committed sample outputs so you can see what a skill produces **without installing anything**.

Each folder is one run. The duo mirrors what every story-producing skill writes to `storywright/<timestamp>-<slug>/` (at the project root):

- `story.standard.md` — PM-facing, CommonMark. No technical detail. Pastes cleanly into Jira Cloud, Notion, Linear, and GitHub Issues.
- `story.dev.md` — dev-facing, full technical detail (file paths, edge cases, analytics, risks, command-level DoD).

| Folder | Input | Skill |
|---|---|---|
| `login-google/` | `examples/input-prompt.md` ("Permitir login con Google") | `story-generate` |

The PM files deliberately contain **no** file paths, imports, commands, edge-case sections, or dependency prose — that separation is enforced by `storywright-base` rule 3 / 3a and checked in `tests/skills-shape.test.mjs`.
