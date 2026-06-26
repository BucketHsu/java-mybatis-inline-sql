# Changelog

[English](CHANGELOG.md) | [繁體中文](CHANGELOG.zh-TW.md)

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
