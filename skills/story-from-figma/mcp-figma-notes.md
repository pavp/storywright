# Setting up a Figma MCP server

`story-from-figma` works best when Claude Code can call a Figma MCP server. This file documents the options known to work; we do **not** ship our own server.

## Option A — Official Figma Dev Mode MCP (recommended)

Figma's Dev Mode MCP exposes file/frame metadata directly to AI agents. Setup:

1. Open Figma → enable Dev Mode on your file/team plan.
2. From the Dev Mode panel, copy the MCP server URL or token.
3. In your Claude Code MCP config (`~/.claude/mcp.json` or project `.mcp.json`):
   ```json
   {
     "mcpServers": {
       "figma": {
         "type": "http",
         "url": "https://mcp.figma.com/sse",
         "headers": {
           "Authorization": "Bearer ${FIGMA_TOKEN}"
         }
       }
     }
   }
   ```
4. Set `FIGMA_TOKEN` in your shell environment.
5. Restart Claude Code.

Check availability inside Claude Code: ask "what MCP tools are available for figma?" — expect tools like `figma_get_file`, `figma_get_frame`, `figma_list_frames`.

## Option B — Community Figma MCP

Several community implementations exist (search GitHub for `figma-mcp` or `figma-context-mcp`). Setup is similar but tool names differ. The skill is written to be tool-name-agnostic — it asks Claude to "list pages", "list frames", "fetch frame metadata" using whichever tools the server provides.

## Option C — No MCP (screenshot fallback)

If you cannot set up MCP:

1. In Figma, select the frames you care about.
2. `Export` → PNG @ 2x.
3. Drop the PNGs into Claude Code chat alongside the prompt.
4. The skill will use Claude vision and degrade gracefully — flow structure must be described by the user.

## Permissions reminder

A Figma token gives read access to your designs. Use a **scoped token** with read-only access to the specific team/project. Never commit the token to git.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Tool not found" in chat | MCP not connected | Restart Claude Code; verify `~/.claude/mcp.json` |
| 401 / 403 | Token missing or revoked | Re-issue scoped token |
| Empty frame list | Figma file is private to another team | Switch token / share file with token's account |
| Slow responses | Large file | Pass a page URL instead of the whole file URL |
