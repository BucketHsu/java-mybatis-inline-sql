# 變更紀錄

[English](CHANGELOG.md) | [繁體中文](CHANGELOG.zh-TW.md)

## 0.0.3

- 在 MyBatis `<script>` text block 中，針對裸 `<`、`<=`、`&`、`&&` 新增 diagnostics 與 quick fix。
- `>`、`>=`、`"`、`'` 保留 completion 與選取文字後手動轉換，預設不顯示 warning。

## 0.0.2

- 在 `<script>` 包住的 Java text block 中，於 XML entity 旁邊顯示解碼提示。
- 新增 `<script>` text block 內的 XML entity completion，以及選取文字後轉換 / 還原 XML entity 的命令。
- 改善 `&lt;=` 與 `&gt;=` 這類運算子的解碼提示顯示。

## 0.0.1

- 初版發佈。
- 高亮 Java MyBatis `@Select`、`@Insert`、`@Update`、`@Delete` text block 內的 SQL。
- 高亮以 `/*sql*/` 標記的 Java text block 內的 SQL。
