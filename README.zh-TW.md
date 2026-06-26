# Java MyBatis Inline SQL

[English](README.md) | [繁體中文](README.zh-TW.md)

在 Java MyBatis annotation 的 text block 內提供 SQL 語法高亮。

這個 extension 使用 VS Code TextMate grammar injection。它會在 Java 檔案中，將直接寫在 MyBatis mapper annotation 裡的 Java text block 當成 SQL 高亮；同時也保留選用的 `/*sql*/` 手動標記模式。

它也包含一個很小的 runtime 功能：在 MyBatis `<script>` text block 裡，像 `&lt;` 這類 XML entity 可以在旁邊顯示灰色的解碼結果，也可以透過 completion 輔助輸入 XML entity。

## 功能

- 自動高亮以下 MyBatis annotation 內的 Java text block：
  - `@Select`
  - `@Insert`
  - `@Update`
  - `@Delete`
- 高亮以 `/*sql*/`、`/* sql */` 或 `/*   sql   */` 標記的 Java text block。
- 透過 TextMate grammar injection 注入到 `source.java`。
- 在包含 `<script>` 與 `</script>` 的 Java text block 中，於 XML entity 旁邊顯示解碼後的灰色提示。
- 在 `<script>` text block 中提供 XML entity completion。
- 提供選取文字後轉換 XML entity / 還原 XML entity 的命令。
- 高亮 `<script>`、`<choose>`、`<when>`、`<if>`、`<foreach>`、`<where>`、`<set>` 等 MyBatis dynamic SQL tag。
- 高亮 MyBatis `#{}` 與 `${}` placeholder。
- 提供常用 MyBatis annotation text block 與 dynamic SQL tag snippets。
- 不需要 Language Server。

## 支援範例

```java
package demo;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface UserMapper {

    @Select("""
        SELECT active
        FROM APP_USER
        WHERE USER_ID = #{userId}
    """)
    String getActiveFlag(@Param("userId") String userId);

    @Insert("""
        INSERT INTO APP_USER (USER_ID, DISPLAY_NAME)
        VALUES (#{userId}, #{displayName})
    """)
    int insertUser(User user);

    @Update(
        """
        UPDATE APP_USER
        SET active = #{active}
        WHERE USER_ID = #{userId}
        """
    )
    int updateUser(User user);

    @Delete("""
        DELETE FROM APP_USER
        WHERE USER_ID = #{userId}
    """)
    int deleteUser(@Param("userId") String userId);

    default String manualSql() {
        String sql = /* sql */"""
            SELECT *
            FROM APP_USER
            WHERE USER_ID = #{userId}
        """;
        return sql;
    }

    @Select(/*sql*/"""
        SELECT *
        FROM APP_USER
        WHERE USER_ID = #{userId}
    """)
    String query(@Param("userId") String userId);

    @Select("""
        <script>
        SELECT *
        FROM APP_USER
        WHERE CREATE_TIME &lt; #{beforeTime}
        </script>
    """)
    List<User> findBefore(@Param("beforeTime") String beforeTime);
}
```

主要使用情境是 MyBatis annotation 自動辨識，不需要另外寫 `/*sql*/`。手動標記模式只是保留給一般 Java 變數，或 annotation 規則無法涵蓋的簡單情境。

## 本機測試

1. 用 VS Code 開啟這個資料夾。
2. 按 `F5` 啟動 Extension Development Host。
3. 在 Extension Development Host 視窗中開啟 `.java` 檔案。
4. 貼上上方 Mapper 範例。
5. 確認符合規則的 Java text block 內容有 SQL 語法高亮。

## XML Entity 輔助功能

當 Java text block 同時包含 `<script>` 與 `</script>` 時，這個 extension 會在 XML entity 旁邊顯示解碼後的灰色提示：

```java
@Select("""
    <script>
    SELECT *
    FROM APP_USER
    WHERE CREATE_TIME &lt; #{beforeTime}
    </script>
""")
```

以上範例中的 `&lt;` 旁邊會顯示灰色的 `<` 提示。

在 `<script>` text block 中輸入 `<` 或 `&` 時，會提供以下 XML entity completion：

- `&lt;`
- `&lt;=`
- `&gt;`
- `&gt;=`
- `&amp;`
- `&amp;&amp;`
- `&quot;`
- `&apos;`

命令面板也提供：

- `Java MyBatis Inline SQL: Encode XML Entities`
- `Java MyBatis Inline SQL: Decode XML Entities`

請先選取文字，再執行上述命令。

這個 extension 會針對 MyBatis `<script>` SQL 中常見、容易造成 XML 解析錯誤的字元顯示 warning，並提供 quick fix：

- `<` -> `&lt;`
- `<=` -> `&lt;=`
- `&` -> `&amp;`
- `&&` -> `&amp;&amp;`

Quick fix 可以只替換單一 unsafe operator，也可以一次轉換目前 `<script>` block 內所有需要 escape 的 XML operator，同時保留 `<choose>`、`<when>` 這類 MyBatis tag。

以下寫法也支援 completion 與選取文字後手動轉換，但預設不顯示 warning，因為 `>` 在 XML 文字節點中通常可以直接使用：

- `>` -> `&gt;`
- `>=` -> `&gt;=`
- `"` -> `&quot;`
- `'` -> `&apos;`

## Snippets

這個 extension 提供以下 Java snippets：

- `mbselect`
- `mbscript`
- `mbif`
- `mbchoose`
- `mbforeach`
- `mbwhere`
- `mbset`

## 本機打包與安裝

如果尚未安裝 `vsce`，先安裝：

```bash
npm install -g @vscode/vsce
```

打包 extension：

```bash
vsce package
```

安裝產生的 VSIX：

```bash
code --install-extension java-mybatis-inline-sql-highlighter-0.0.7.vsix
```

打包注意事項：

- 發佈到 Marketplace 前，請先把 `package.json` 裡的 `repository.url` 改成實際 Git repository。
- `.vscodeignore` 檔案會限制 VSIX 內只放必要檔案，避免把已產生的 `.vsix` 再包進去。
- 專案已包含 `LICENSE`，因此 `vsce package` 不會再提示缺少授權檔案。

## 限制

- 這個 extension 只提供語法高亮。
- 它不是 SQL formatter。
- 它不是 SQL validator。
- 它不是 MyBatis parser。
- XML entity completion 只會在同時包含 `<script>` 與 `</script>` 的 Java text block 中啟用。
- MyBatis dynamic SQL tag 是透過 TextMate pattern 高亮，不是完整 XML parser。
- 不支援 `@SelectProvider`、`@InsertProvider`、`@UpdateProvider` 或 `@DeleteProvider`。
- 不支援 `@Select({"SELECT ..."})`、字串相加、變數或常數，例如 `@Select(SQL_FIND_USER)`。
- MyBatis placeholder，例如 `#{userId}` 與 `${name}`，目前會維持 SQL 文字處理，不做特別解析。
- Java text block 需要 Java 15+，或專案本身已設定可使用 text block。
- Java 是否能成功編譯，仍取決於你的 Java、Maven、Gradle 與 IDE 設定。

TextMate grammar 是以 regex 為基礎，不是完整 parser。annotation 規則刻意維持簡單，目標支援直接寫法：

```java
@Select("""
    SELECT *
    FROM APP_USER
""")
```

以及換行寫法：

```java
@Select(
    """
    SELECT *
    FROM APP_USER
    """
)
```

如果 annotation 的括號與 text block 之間出現複雜 Java expression，這個 extension 不會把它當成嵌入 SQL。

## 備註

`/*sql*/` 標記是 Java 註解，編譯後不會進入 Java 字串內容。
