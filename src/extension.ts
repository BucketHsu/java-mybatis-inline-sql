import * as vscode from "vscode";

interface EntityInfo {
  entity: string;
  char: string;
  label: string;
}

const ENTITIES: EntityInfo[] = [
  { entity: "&lt;", char: "<", label: "less than" },
  { entity: "&gt;", char: ">", label: "greater than" },
  { entity: "&amp;", char: "&", label: "ampersand" },
  { entity: "&quot;", char: "\"", label: "double quote" },
  { entity: "&apos;", char: "'", label: "single quote" }
];

const ENTITY_TO_CHAR = new Map<string, string>(ENTITIES.map((item) => [item.entity, item.char]));
const CHAR_TO_ENTITY = new Map<string, string>(ENTITIES.map((item) => [item.char, item.entity]));
const EXTENSION_ID = "java-mybatis-inline-sql-highlighter";

interface CompletionInfo {
  insertText: string;
  detail: string;
  documentation: string;
}

const ENTITY_COMPLETIONS: CompletionInfo[] = [
  { insertText: "&lt;", detail: "XML entity for <", documentation: "Less than." },
  { insertText: "&lt;=", detail: "XML entity for <=", documentation: "Less than or equal." },
  { insertText: "&gt;", detail: "XML entity for >", documentation: "Greater than." },
  { insertText: "&gt;=", detail: "XML entity for >=", documentation: "Greater than or equal." },
  { insertText: "&amp;", detail: "XML entity for &", documentation: "Ampersand." },
  { insertText: "&amp;&amp;", detail: "XML entity for &&", documentation: "Logical AND." },
  { insertText: "&quot;", detail: "XML entity for double quote", documentation: "Double quote." },
  { insertText: "&apos;", detail: "XML entity for single quote", documentation: "Single quote." }
];

let entityDecorationType: vscode.TextEditorDecorationType;
let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context extension context
 */
export function activate(context: vscode.ExtensionContext): void {
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

/**
 * Deactivates the extension.
 */
export function deactivate(): void {}

/**
 * XML Entity Completion Item Provider.
 */
class XmlEntityCompletionProvider implements vscode.CompletionItemProvider {
  /**
   * Provides completion items.
   *
   * @param {vscode.TextDocument} document current document
   * @param {vscode.Position} position current position
   * @returns {vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList>} list of completion items
   */
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
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

/**
 * XML Entity Code Action Provider.
 */
class XmlEntityCodeActionProvider implements vscode.CodeActionProvider {
  /**
   * Provides code actions.
   *
   * @param {vscode.TextDocument} document current document
   * @param {vscode.Range | vscode.Selection} range selected range
   * @param {vscode.CodeActionContext} context code action context
   * @returns {vscode.ProviderResult<vscode.CodeAction[]>} list of code actions
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];
    const blockActionKeys = new Set<string>();

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

      const diagnosticOffset = document.offsetAt(diagnostic.range.start);
      const block = findScriptTextBlockAt(document.getText(), diagnosticOffset);
      if (!block) {
        continue;
      }

      const blockKey = `${block.contentStart}:${block.contentEnd}`;
      if (blockActionKeys.has(blockKey)) {
        continue;
      }

      const content = document.getText(new vscode.Range(
        document.positionAt(block.contentStart),
        document.positionAt(block.contentEnd)
      ));
      const encodedContent = encodeUnsafeMyBatisScriptText(content);
      if (encodedContent === content) {
        continue;
      }

      const blockAction = new vscode.CodeAction(
        "Encode XML entities in this <script> block",
        vscode.CodeActionKind.QuickFix
      );
      blockAction.edit = new vscode.WorkspaceEdit();
      blockAction.edit.replace(
        document.uri,
        new vscode.Range(
          document.positionAt(block.contentStart),
          document.positionAt(block.contentEnd)
        ),
        encodedContent
      );
      blockAction.diagnostics = [diagnostic];
      actions.push(blockAction);
      blockActionKeys.add(blockKey);
    }

    return actions;
  }
}

/**
 * Updates decorations in active editor.
 */
function updateActiveEditorDecorations(): void {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    updateEntityDecorations(editor);
    updateXmlEntityDiagnostics(editor.document);
  }
}

/**
 * Updates XML entity decorations.
 *
 * @param {vscode.TextEditor} editor active editor
 */
function updateEntityDecorations(editor: vscode.TextEditor): void {
  if (editor.document.languageId !== "java") {
    editor.setDecorations(entityDecorationType, []);
    return;
  }

  const text = editor.document.getText();
  const decorations: vscode.DecorationOptions[] = [];

  for (const block of findScriptTextBlocks(text)) {
    const content = text.slice(block.contentStart, block.contentEnd);
    const entityRegex = /&(lt|gt|amp|quot|apos);=?/g;
    let match: RegExpExecArray | null;

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

/**
 * Updates diagnostics for unsafe XML entities.
 *
 * @param {vscode.TextDocument} document document to update
 */
function updateXmlEntityDiagnostics(document: vscode.TextDocument): void {
  if (!diagnosticCollection || document.languageId !== "java") {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];
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

/**
 * Creates a diagnostic for XML entities.
 *
 * @param {vscode.TextDocument} document document
 * @param {number} startOffset start offset
 * @param {number} length length of target text
 * @param {string} message diagnostic message
 * @returns {vscode.Diagnostic} generated diagnostic
 */
function createEntityDiagnostic(
  document: vscode.TextDocument,
  startOffset: number,
  length: number,
  message: string
): vscode.Diagnostic {
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

/**
 * Replaces selection.
 *
 * @param {(text: string) => string} transform text transformation function
 */
function replaceSelection(transform: (text: string) => string): void {
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

/**
 * Encodes XML entities.
 *
 * @param {string} text input text
 * @returns {string} encoded text
 */
function encodeXmlEntities(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos);|&(?!lt;|gt;|amp;|quot;|apos;)|[<>"']/g, (match) => {
    return ENTITY_TO_CHAR.has(match) ? match : CHAR_TO_ENTITY.get(match) || match;
  });
}

/**
 * Encodes operators into XML entities.
 *
 * @param {string} text input text
 * @returns {string} encoded operator
 */
function encodeOperatorText(text: string): string {
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

/**
 * Encodes unsafe MyBatis script text.
 *
 * @param {string} text input text
 * @returns {string} encoded text
 */
function encodeUnsafeMyBatisScriptText(text: string): string {
  let result = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "<") {
      if (isXmlTagStart(text, index)) {
        result += char;
        continue;
      }

      if (text[index + 1] === "=") {
        result += "&lt;=";
        index += 1;
      } else {
        result += "&lt;";
      }
      continue;
    }

    if (char === "&") {
      if (isKnownXmlEntity(text, index)) {
        result += char;
        continue;
      }

      if (text.startsWith("&&", index)) {
        result += "&amp;&amp;";
        index += 1;
      } else {
        result += "&amp;";
      }
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Decodes XML entities.
 *
 * @param {string} text input text
 * @returns {string} decoded text
 */
function decodeXmlEntities(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos);/g, (entity) => ENTITY_TO_CHAR.get(entity) || entity);
}

/**
 * Checks whether cursor is inside a script text block.
 *
 * @param {vscode.TextDocument} document document
 * @param {vscode.Position} position position
 * @returns {boolean} true if inside a script block
 */
function isInsideScriptTextBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
  const offset = document.offsetAt(position);
  return findScriptTextBlocks(document.getText()).some((block) => {
    return offset >= block.contentStart && offset <= block.contentEnd;
  });
}

interface ScriptBlock {
  contentStart: number;
  contentEnd: number;
}

/**
 * Finds script text blocks.
 *
 * @param {string} text full text
 * @returns {ScriptBlock[]} list of script blocks
 */
function findScriptTextBlocks(text: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const textBlockRegex = /"""/g;
  let begin: RegExpExecArray | null;

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

/**
 * Finds script text block at specific offset.
 *
 * @param {string} text full text
 * @param {number} offset offset
 * @returns {ScriptBlock | undefined} script block if found
 */
function findScriptTextBlockAt(text: string, offset: number): ScriptBlock | undefined {
  return findScriptTextBlocks(text).find((block) => {
    return offset >= block.contentStart && offset <= block.contentEnd;
  });
}

/**
 * Checks whether entity is known XML entity.
 *
 * @param {string} text full text
 * @param {number} index current index
 * @returns {boolean} true if known
 */
function isKnownXmlEntity(text: string, index: number): boolean {
  return /^&(lt|gt|amp|quot|apos);/.test(text.slice(index));
}

/**
 * Checks whether index is at XML tag start.
 *
 * @param {string} text full text
 * @param {number} index current index
 * @returns {boolean} true if XML tag start
 */
function isXmlTagStart(text: string, index: number): boolean {
  const next = text[index + 1] || "";
  if (next === "/" || next === "!" || next === "?") {
    return true;
  }
  return /[A-Za-z_]/.test(next);
}
