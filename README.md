# Java MyBatis Inline SQL

[English](README.md) | [繁體中文](README.zh-TW.md)

Highlight SQL inside Java MyBatis annotation text blocks.

This extension uses a VS Code TextMate grammar injection for Java files. It injects SQL highlighting into Java text blocks used directly in MyBatis mapper annotations, and also supports an optional manual `/*sql*/` marker.

It also includes a small runtime feature for MyBatis `<script>` text blocks: XML entities such as `&lt;` can show their decoded character in gray text, and completion items can help insert XML entity forms.

## Features

- Highlights SQL inside Java text blocks passed directly to:
  - `@Select`
  - `@Insert`
  - `@Update`
  - `@Delete`
- Highlights SQL inside Java text blocks marked with `/*sql*/`, `/* sql */`, or `/*   sql   */`.
- Works through TextMate grammar injection into `source.java`.
- Shows decoded hints beside XML entities inside Java text blocks wrapped with `<script>` and `</script>`.
- Provides completion items for XML entities inside `<script>` text blocks.
- Provides commands to encode or decode XML entities in the selected text.
- Highlights MyBatis dynamic SQL tags such as `<script>`, `<choose>`, `<when>`, `<if>`, `<foreach>`, `<where>`, and `<set>`.
- Highlights MyBatis `#{}` and `${}` placeholders.
- Provides snippets for common MyBatis annotation text blocks and dynamic SQL tags.
- Does not require a language server.

## Supported Examples

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

The main use case is automatic highlighting for MyBatis annotations without writing `/*sql*/`. The marker form is only a fallback for plain Java variables or cases where the annotation pattern is not enough.

## Local Testing

1. Open this folder in VS Code.
2. Press `F5` to start an Extension Development Host.
3. In the Extension Development Host, open a `.java` file.
4. Paste the mapper example above.
5. Confirm that SQL inside the matching Java text blocks receives SQL syntax highlighting.

## XML Entity Helpers

When a Java text block contains both `<script>` and `</script>`, this extension can show decoded XML entities beside the source text:

```java
@Select("""
    <script>
    SELECT *
    FROM APP_USER
    WHERE CREATE_TIME &lt; #{beforeTime}
    </script>
""")
```

In this example, `&lt;` can show a gray `<` hint beside it.

Inside a `<script>` text block, typing `<` or `&` can show completion items for:

- `&lt;`
- `&lt;=`
- `&gt;`
- `&gt;=`
- `&amp;`
- `&amp;&amp;`
- `&quot;`
- `&apos;`

The command palette also includes:

- `Java MyBatis Inline SQL: Encode XML Entities`
- `Java MyBatis Inline SQL: Decode XML Entities`

Select text first, then run one of these commands.

The extension reports warnings with quick fixes for XML characters that commonly break MyBatis `<script>` SQL:

- `<` -> `&lt;`
- `<=` -> `&lt;=`
- `&` -> `&amp;`
- `&&` -> `&amp;&amp;`

Quick fixes can replace a single unsafe operator, or encode all unsafe XML operators in the current `<script>` block while keeping MyBatis tags such as `<choose>` and `<when>` unchanged.

The following forms are also available through completion and manual selection conversion, but are not reported as warnings by default because `>` is usually valid in XML text nodes:

- `>` -> `&gt;`
- `>=` -> `&gt;=`
- `"` -> `&quot;`
- `'` -> `&apos;`

## Snippets

The extension contributes Java snippets for common MyBatis inline SQL patterns:

- `mbselect`
- `mbscript`
- `mbif`
- `mbchoose`
- `mbforeach`
- `mbwhere`
- `mbset`

## Package and Install Locally

Install `vsce` if needed:

```bash
npm install -g @vscode/vsce
```

Package the extension:

```bash
vsce package
```

Install the generated VSIX:

```bash
code --install-extension java-mybatis-inline-sql-highlighter-0.0.7.vsix
```

Notes for packaging:

- Update the `repository.url` in `package.json` before publishing to the Marketplace.
- The `.vscodeignore` file keeps the VSIX package small and avoids including generated `.vsix` files.
- `LICENSE` is included so `vsce package` does not warn about a missing license file.

## Limitations

- This extension only provides syntax highlighting.
- It is not a SQL formatter.
- It is not a SQL validator.
- It is not a MyBatis parser.
- XML entity completion is limited to Java text blocks that contain both `<script>` and `</script>`.
- MyBatis dynamic SQL tags are highlighted as TextMate patterns, not parsed as a full XML document.
- It does not support `@SelectProvider`, `@InsertProvider`, `@UpdateProvider`, or `@DeleteProvider`.
- It does not support `@Select({"SELECT ..."})`, string concatenation, variables, or constants such as `@Select(SQL_FIND_USER)`.
- MyBatis placeholders such as `#{userId}` and `${name}` are left as normal SQL text.
- Java text blocks require Java 15+, or a project setup that supports text blocks.
- Java compilation still depends on your Java, Maven, Gradle, and IDE settings.

TextMate grammars are regex based and are not full parsers. The annotation pattern is intentionally simple and targets direct annotation usage such as:

```java
@Select("""
    SELECT *
    FROM APP_USER
""")
```

and:

```java
@Select(
    """
    SELECT *
    FROM APP_USER
    """
)
```

If a Java expression appears between the annotation parenthesis and the text block, this extension will not treat it as embedded SQL.

## Notes

The `/*sql*/` marker is a Java comment. It is not included in the compiled Java string.
