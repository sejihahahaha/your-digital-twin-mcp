Troubleshooting MCP Start Button

If the MCP "Start" button is not visible in VS Code Insiders, follow these checks in order.

1) Open the correct workspace
- Make sure you opened the `mydigitaltwin` folder as the workspace root (File → Open Folder → select `.../digital-twin-workshop/mydigitaltwin`).
- Or run from PowerShell:

  ```powershell
  code-insiders C:\Users\Krystel\digital-twin-workshop\mydigitaltwin
  ```

- After opening, reload the window: Command Palette → Developer: Reload Window.

2) Confirm MCP config presence and validity
- Confirm `mydigitaltwin/.vscode/mcp.json` exists and contains a `servers` entry. You should see:

  ```jsonc
  {
    "servers": {
      "digital-twin-mcp": {
        "name": "Digital Twin MCP",
        "protocol": "mcp-http/1.0",
        "type": "http",
        "url": "http://localhost:3000/api/mcp",
        "healthcheck": "/api/mcp",
        "timeout": 30000,
        "description": "Digital Twin RAG MCP Server for interview preparation"
      }
    }
  }
  ```

3) Install/enable the MCP-capable extension
- The Start button is provided by an extension (e.g., GitHub Copilot or an MCP-specific extension). In VS Code Insiders open the Extensions view (Ctrl+Shift+X) and search for:
  - "GitHub Copilot"
  - any extension named "MCP" or "Copilot MCP"
- Install and enable it, then reload the window.

4) Look for the Start button locations
- Activity Bar: open the Copilot / MCP view (left side) and look for your server listing with Start/Stop controls.
- Open `mydigitaltwin/.vscode/mcp.json` in the editor — some extensions show a CodeLens or a small Start button above the file.
- Command Palette: Ctrl+Shift+P → type "MCP", "Copilot", or "Start MCP" to run any registered commands.

5) Verify the endpoint works (healthcheck)
- Start your Next dev server if not running:

  ```powershell
  cd C:\Users\Krystel\digital-twin-workshop\mydigitaltwin
  pnpm dev
  ```

- In a separate PowerShell run:

  ```powershell
  # GET healthcheck
  Invoke-WebRequest -Uri "http://localhost:3000/api/mcp" -UseBasicParsing

  # POST test
  $body = @{ question = "Hello" } | ConvertTo-Json
  Invoke-WebRequest -Uri "http://localhost:3000/api/mcp" -Method POST -Body $body -ContentType "application/json" | Select-Object -Expand Content
  ```

- If these calls fail, fix the server first (Start button will not help if endpoint is unreachable).

6) Developer console & logs
- If the extension is installed but the Start button is still missing, open Developer Tools in VS Code Insiders: Command Palette → Developer: Toggle Developer Tools → Console tab. Look for errors related to MCP, Copilot, or reading `mcp.json`.

7) List installed extensions (CLI)
- In PowerShell, run:

  ```powershell
  code-insiders --list-extensions
  ```

  Confirm Copilot/MCP extension is present.

8) If nothing shows
- Try copying `mydigitaltwin/.vscode/mcp.json` to the workspace root `.vscode/mcp.json` (we already created a copy at the repo root). Some extensions only read root workspace `.vscode`.

9) If you tell me which MCP extension you're using I can add exact extension-specific steps and settings to enable MCP features.

If you'd like, I can also:
- Add a VS Code task to run `pnpm dev` and a healthcheck task to help you start the server from the Command Palette.
- Add a small status page (`/mcp-health`) inside the app that returns 200 OK for easier detection.

Reply with which option you want next or paste any console errors you find and I'll interpret them.