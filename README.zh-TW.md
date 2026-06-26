# Java MyBatis Inline SQL

[English](README.md) | [繁體中文](README.zh-TW.md)

在 Java MyBatis annotation 的 text block 內提供 SQL 語法高亮。

這個 extension 是給 VS Code 使用的 TextMate grammar injection。它會在 Java 檔案中，將直接寫在 MyBatis mapper annotation 裡的 Java text block 當成 SQL 高亮；同時也保留選用的 `/*sql*/` 手動標記模式。

## 功能

- 自動高亮以下 MyBatis annotation 內的 Java text block：
  - `@Select`
  - `@Insert`
  - `@Update`
  - `@Delete`
- 高亮以 `/*sql*/`、`/* sql */` 或 `/*   sql   */` 標記的 Java text block。
- 透過 TextMate grammar injection 注入到 `source.java`。
- 不需要 Language Server，也不需要 extension runtime 程式。

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
        SELECT isStop
        FROM SYSSA_USER
        WHERE EMPNO = #{empno}
    """)
    String getIsStop(@Param("empno") String empno);

    @Insert("""
        INSERT INTO SYSSA_USER (EMPNO, USER_NAME)
        VALUES (#{empno}, #{userName})
    """)
    int insertUser(User user);

    @Update(
        """
        UPDATE SYSSA_USER
        SET isStop = #{isStop}
        WHERE EMPNO = #{empno}
        """
    )
    int updateUser(User user);

    @Delete("""
        DELETE FROM SYSSA_USER
        WHERE EMPNO = #{empno}
    """)
    int deleteUser(@Param("empno") String empno);

    default String manualSql() {
        String sql = /* sql */"""
            SELECT *
            FROM SYSSA_USER
            WHERE EMPNO = #{empno}
        """;
        return sql;
    }

    @Select(/*sql*/"""
        SELECT *
        FROM SYSSA_USER
        WHERE EMPNO = #{empno}
    """)
    String query(@Param("empno") String empno);
}
```

主要使用情境是 MyBatis annotation 自動辨識，不需要另外寫 `/*sql*/`。手動標記模式只是保留給一般 Java 變數，或 annotation 規則無法涵蓋的簡單情境。

## 本機測試

1. 用 VS Code 開啟這個資料夾。
2. 按 `F5` 啟動 Extension Development Host。
3. 在 Extension Development Host 視窗中開啟 `.java` 檔案。
4. 貼上上方 Mapper 範例。
5. 確認符合規則的 Java text block 內容有 SQL 語法高亮。

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
code --install-extension java-mybatis-inline-sql-0.0.1.vsix
```

打包注意事項：

- 發佈到 Marketplace 前，請先把 `package.json` 裡的 `repository.url` 改成實際 Git repository。
- `files` 欄位會限制 VSIX 內只放必要檔案，避免把已產生的 `.vsix` 再包進去。
- 專案已包含 `LICENSE`，因此 `vsce package` 不會再提示缺少授權檔案。

## 限制

- 這個 extension 只提供語法高亮。
- 它不是 SQL formatter。
- 它不是 SQL validator。
- 它不是 MyBatis parser。
- 它不提供 autocomplete。
- 不支援 `@SelectProvider`、`@InsertProvider`、`@UpdateProvider` 或 `@DeleteProvider`。
- 不支援 `@Select({"SELECT ..."})`、字串相加、變數或常數，例如 `@Select(SQL_FIND_USER)`。
- MyBatis placeholder，例如 `#{empno}` 與 `${name}`，目前會維持 SQL 文字處理，不做特別解析。
- Java text block 需要 Java 15+，或專案本身已設定可使用 text block。
- Java 是否能成功編譯，仍取決於你的 Java、Maven、Gradle 與 IDE 設定。

TextMate grammar 是以 regex 為基礎，不是完整 parser。annotation 規則刻意維持簡單，目標支援直接寫法：

```java
@Select("""
    SELECT *
    FROM SYSSA_USER
""")
```

以及換行寫法：

```java
@Select(
    """
    SELECT *
    FROM SYSSA_USER
    """
)
```

如果 annotation 的括號與 text block 之間出現複雜 Java expression，這個 extension 不會把它當成嵌入 SQL。

## 備註

`/*sql*/` 標記是 Java 註解，編譯後不會進入 Java 字串內容。
