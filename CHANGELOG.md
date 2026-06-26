# Changelog

[English](CHANGELOG.md) | [繁體中文](CHANGELOG.zh-TW.md)

## 0.0.7

- Highlight MyBatis dynamic SQL tags and tag attributes inside inline SQL text blocks.
- Highlight MyBatis `#{}` and `${}` placeholders.
- Add Java snippets for common MyBatis annotation text blocks and dynamic SQL tags.
- Add a quick fix to encode all unsafe XML operators in the current `<script>` block.

## 0.0.6

- Polish Marketplace metadata, display name, keywords, and gallery banner.
- Update local install documentation for the 0.0.6 VSIX package.
- Align diagnostic source name with the published extension name.

## 0.0.5

- Maintenance release.

## 0.0.4

- Sanitize documentation examples to use generic table, column, and parameter names.

## 0.0.3

- Add diagnostics and quick fixes for raw `<`, `<=`, `&`, and `&&` inside MyBatis `<script>` text blocks.
- Keep `>`, `>=`, `"`, and `'` available through completion and manual selection conversion without warning by default.

## 0.0.2

- Show decoded XML entity hints inside Java text blocks wrapped with `<script>`.
- Add XML entity completion and selection encode/decode commands for `<script>` text blocks.
- Improve decoded hints for operators such as `&lt;=` and `&gt;=`.

## 0.0.1

- Initial release.
- Highlight SQL inside Java MyBatis @Select, @Insert, @Update, and @Delete text blocks.
- Highlight SQL inside Java text blocks marked with /*sql*/.
