# Siddur content editor

Local browser UI for editing offline pack Hebrew/English text (line breaks, flatten, seasonals highlight).

```bash
npm run content-editor
```

Opens [http://127.0.0.1:4177](http://127.0.0.1:4177). Saves rewrite the same `.ts` pack files under `src/content/siddur/`.

**Tips**

- Pick prayer / nusach / section in the sidebar
- **Accordion** view: blank-line-separated chunks become collapsible dropdowns
  - Select text → **→ Accordion block** to peel that chunk into its own dropdown
  - **Accordion break** inserts a blank-line separator at the caret
  - Expand all / Collapse all in the toolbar
- **Join lines** / **Flatten selection** for collapsing Adon Olam–style blocks
- **Seasonals** highlights amidah inserts (טל, יעלה ויבא, עננו, …)
- **Ctrl/Cmd+S** saves
- Port override: `CONTENT_EDITOR_PORT=4180 npm run content-editor`
