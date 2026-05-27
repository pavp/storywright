# Example: Figma link

Set up an MCP Figma server (see `skills/story-from-figma/mcp-figma-notes.md`).

Then in Claude Code:

```
generate stories from this figma: https://www.figma.com/file/<your-file-id>/auth-flows
```

Expected: skill enumerates flows on the file, produces one story per flow, attaches `flow-summary.md` for traceability.
