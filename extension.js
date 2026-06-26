const vscode = require("vscode");

const ENTITIES = [
  { entity: "&lt;", char: "<", label: "less than" },
  { entity: "&gt;", char: ">", label: "greater than" },
  { entity: "&amp;", char: "&", label: "ampersand" },
  { entity: "&quot;", char: "\"", label: "double quote" },
  { entity: "&apos;", char: "'", label: "single quote" }
];

const ENTITY_TO_CHAR = new Map(ENTITIES.map((item) => [item.entity, item.char]));
const CHAR_TO_ENTITY = new Map(ENTITIES.map((item) => [item.char, item.entity]));
const EXTENSION_ID = "java-mybatis-inline-sql";
const ENTITY_COMPLETIONS = [
  { insertText: "&lt;", detail: "XML entity for <", documentation: "Less than." },
  { insertText: "&lt;=", detail: "XML entity for <=", documentation: "Less than or equal." },
  { insertText: "&gt;", detail: "XML entity for >", documentation: "Greater than." },
  { insertText: "&gt;=", detail: "XML entity for >=", documentation: "Greater than or equal." },
  { insertText: "&amp;", detail: "XML entity for &", documentation: "Ampersand." },
  { insertText: "&amp;&amp;", detail: "XML entity for &&", documentation: "Logical AND." },
  { insertText: "&quot;", detail: "XML entity for double quote", documentation: "Double quote." },
  { insertText: "&apos;", detail: "XML entity for single quote", documentation: "Single quote." }
];

let entityDecorationType;
let diagnosticCollection;

function activate(context) {
  entityDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: "0 0 0 0.35em",
      color: new vscode.ThemeColor("editorCodeLens.foreground"),
      fontStyle: "italic"
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });

  diagnosticCollection = vscode.languages.createDiagnosticCollection(EXTENSION_ID);

  context.subscriptions.push(entityDecorationType);
  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateActiveEditorDecorations));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      updateEntityDecorations(editor);
    }
    updateXmlEntityDiagnostics(event.document);
  }));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(updateXmlEntityDiagnostics));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
    diagnosticCollection.delete(document.uri);
  }));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
    updateEntityDecorations(event.textEditor);
  }));

  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
    { language: "java" },
    new XmlEntityCompletionProvider(),
    "<",
    "&"
  ));
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider(
    { language: "java" },
    new XmlEntityCodeActionProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "javaMybatisInlineSql.encodeXmlEntities",
    () => replaceSelection(encodeXmlEntities)
  ));
  context.subscriptions.push(vscode.commands.registerCommand(
    "javaMybatisInlineSql.decodeXmlEntities",
    () => replaceSelection(decodeXmlEntities)
  ));

  updateActiveEditorDecorations();
  vscode.workspace.textDocuments.forEach(updateXmlEntityDiagnostics);
}

function deactivate() {}

class XmlEntityCompletionProvider {
  provideCompletionItems(document, position) {
    if (document.languageId !== "java" || !isInsideScriptTextBlock(document, position)) {
      return undefined;
    }

    const previous = position.character > 0
      ? document.getText(new vscode.Range(position.translate(0, -1), position))
      : "";
    const replacePrevious = previous === "<" || previous === "&";
    const range = replacePrevious
      ? new vscode.Range(position.translate(0, -1), position)
      : new vscode.Range(position, position);

    return ENTITY_COMPLETIONS.map((item) => {
      const completion = new vscode.CompletionItem(item.insertText, vscode.CompletionItemKind.Value);
      completion.detail = item.detail;
      completion.documentation = item.documentation;
      completion.insertText = item.insertText;
      completion.range = range;
      return completion;
    });
  }
}

class XmlEntityCodeActionProvider {
  provideCodeActions(document, range, context) {
    const actions = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== EXTENSION_ID || diagnostic.code !== "encode-xml-entity") {
        continue;
      }

      const sourceText = document.getText(diagnostic.range);
      const replacement = encodeOperatorText(sourceText);
      if (replacement === sourceText) {
        continue;
      }

      const action = new vscode.CodeAction(
        `Replace with ${replacement}`,
        vscode.CodeActionKind.QuickFix
      );
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(document.uri, diagnostic.range, replacement);
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      actions.push(action);
    }

    return actions;
  }
}

function updateActiveEditorDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    updateEntityDecorations(editor);
    updateXmlEntityDiagnostics(editor.document);
  }
}

function updateEntityDecorations(editor) {
  if (editor.document.languageId !== "java") {
    editor.setDecorations(entityDecorationType, []);
    return;
  }

  const text = editor.document.getText();
  const decorations = [];

  for (const block of findScriptTextBlocks(text)) {
    const content = text.slice(block.contentStart, block.contentEnd);
    const entityRegex = /&(lt|gt|amp|quot|apos);=?/g;
    let match;

    while ((match = entityRegex.exec(content)) !== null) {
      const sourceText = match[0];
      const entity = sourceText.endsWith("=") ? sourceText.slice(0, -1) : sourceText;
      const decoded = ENTITY_TO_CHAR.get(entity);
      if (!decoded) {
        continue;
      }

      const startOffset = block.contentStart + match.index;
      const endOffset = startOffset + sourceText.length;
      decorations.push({
        range: new vscode.Range(
          editor.document.positionAt(startOffset),
          editor.document.positionAt(endOffset)
        ),
        renderOptions: {
          after: {
            contentText: ` ${decoded}${sourceText.endsWith("=") ? "=" : ""}`
          }
        }
      });
    }
  }

  editor.setDecorations(entityDecorationType, decorations);
}

function updateXmlEntityDiagnostics(document) {
  if (!diagnosticCollection || document.languageId !== "java") {
    return;
  }

  const diagnostics = [];
  const text = document.getText();

  for (const block of findScriptTextBlocks(text)) {
    const content = text.slice(block.contentStart, block.contentEnd);

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const next = content[index + 1] || "";

      if (char === "<") {
        if (isXmlTagStart(content, index)) {
          continue;
        }

        const length = next === "=" ? 2 : 1;
        diagnostics.push(createEntityDiagnostic(
          document,
          block.contentStart + index,
          length,
          `Use ${length === 2 ? "&lt;=" : "&lt;"} inside MyBatis <script>.`
        ));
        index += length - 1;
        continue;
      }

      if (char === "&") {
        if (content.startsWith("&&", index)) {
          diagnostics.push(createEntityDiagnostic(
            document,
            block.contentStart + index,
            2,
            "Use &amp;&amp; inside MyBatis <script>."
          ));
          index += 1;
          continue;
        }

        if (isKnownXmlEntity(content, index)) {
          continue;
        }

        diagnostics.push(createEntityDiagnostic(
          document,
          block.contentStart + index,
          1,
          "Use &amp; inside MyBatis <script>."
        ));
      }
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

function createEntityDiagnostic(document, startOffset, length, message) {
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(
      document.positionAt(startOffset),
      document.positionAt(startOffset + length)
    ),
    message,
    vscode.DiagnosticSeverity.Warning
  );
  diagnostic.source = EXTENSION_ID;
  diagnostic.code = "encode-xml-entity";
  return diagnostic;
}

function replaceSelection(transform) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "java") {
    return;
  }

  editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      if (selection.isEmpty) {
        continue;
      }

      const selectedText = editor.document.getText(selection);
      editBuilder.replace(selection, transform(selectedText));
    }
  });
}

function encodeXmlEntities(text) {
  return text.replace(/&(lt|gt|amp|quot|apos);|&(?!lt;|gt;|amp;|quot;|apos;)|[<>"']/g, (match) => {
    return ENTITY_TO_CHAR.has(match) ? match : CHAR_TO_ENTITY.get(match) || match;
  });
}

function encodeOperatorText(text) {
  switch (text) {
    case "<=":
      return "&lt;=";
    case "<":
      return "&lt;";
    case "&&":
      return "&amp;&amp;";
    case "&":
      return "&amp;";
    default:
      return encodeXmlEntities(text);
  }
}

function decodeXmlEntities(text) {
  return text.replace(/&(lt|gt|amp|quot|apos);/g, (entity) => ENTITY_TO_CHAR.get(entity) || entity);
}

function isInsideScriptTextBlock(document, position) {
  const offset = document.offsetAt(position);
  return findScriptTextBlocks(document.getText()).some((block) => {
    return offset >= block.contentStart && offset <= block.contentEnd;
  });
}

function findScriptTextBlocks(text) {
  const blocks = [];
  const textBlockRegex = /"""/g;
  let begin;

  while ((begin = textBlockRegex.exec(text)) !== null) {
    const contentStart = begin.index + 3;
    const end = text.indexOf("\"\"\"", contentStart);
    if (end === -1) {
      break;
    }

    const content = text.slice(contentStart, end);
    if (/<script\b[^>]*>/i.test(content) && /<\/script>/i.test(content)) {
      blocks.push({ contentStart, contentEnd: end });
    }

    textBlockRegex.lastIndex = end + 3;
  }

  return blocks;
}

function isKnownXmlEntity(text, index) {
  return /^&(lt|gt|amp|quot|apos);/.test(text.slice(index));
}

function isXmlTagStart(text, index) {
  const next = text[index + 1] || "";
  if (next === "/" || next === "!" || next === "?") {
    return true;
  }
  return /[A-Za-z_]/.test(next);
}

module.exports = {
  activate,
  deactivate
};
