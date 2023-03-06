import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import initSqlite from "./sqlite3-bundler-friendly.mjs";

window.MonacoEnvironment = { getWorker: () => new editorWorker() };

function initEditor(id: string, readOnly: boolean) {
  const el = document.getElementById(id)!;
  const model = monaco.editor.createModel("", "sql");
  const editor = monaco.editor.create(el, {
    language: "sql",
    lineNumbers: "off",
    model,
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    readOnly,
    renderLineHighlight: "none",
    scrollBeyondLastLine: false,
    wordWrap: "on",
  });
  editor.onDidContentSizeChange(() => {
    const height = Math.min(600, editor.getContentHeight());
    const { width } = el.getBoundingClientRect();
    el.style.height = `${height}px`;
    editor.layout({ width, height });
  });
  return {
    model,
    editor,
  };
}

async function init() {
  const sqlite3 = await initSqlite();
  const db = new sqlite3.oo1.DB(":localStorage:", "ct");

  const history = initEditor("history", true);
  const queries = initEditor("queries", false);

  queries.editor.addAction({
    id: "run",
    keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
    label: "Run",
    run,
  });

  function run() {
    const sql = queries.model.getValue();
    try {
      const start = performance.now();
      const rows = db.exec(sql, { rowMode: "object" });
      const time = performance.now() - start;
      let text = history.model.getValue();
      text += `${text ? "\n" : ""}${sql}\n`;
      text += `-- ${JSON.stringify(rows)} (${time.toFixed(1)}ms)`;
      history.model.setValue(text);
      queries.model.setValue("");
    } catch (e) {
      monaco.editor.setModelMarkers(queries.model, "qads", [
        {
          message: `${e}`,
          severity: monaco.MarkerSeverity.Error,
          ...queries.model.getFullModelRange(),
        },
      ]);
    }
    queries.editor.focus();
  }

  document.getElementById("run")!.addEventListener("click", run);
  document.getElementById("clear")!.addEventListener("click", () => {
    history.model.setValue("");
    sqlite3.capi.sqlite3_js_kvvfs_clear();
  });

  queries.editor.focus();
}

init();
