import { describe, it, expect } from "vitest";
import { MD } from "../MD.js";

describe("MD core parser", () => {
  it("should parse headers (#, ##, ###, ####)", () => {
    const md = new MD();
    const input = "# Title\n## Subtitle\n### Sub\n#### Mini";
    const output = md.parse(input);
    expect(output).toContain('<h1 class="md-header"> Title</h1>');
    expect(output).toContain('<h2 class="md-header"> Subtitle</h2>');
    expect(output).toContain('<h3 class="md-header"> Sub</h3>');
    expect(output).toContain('<h4 class="md-header"> Mini</h4>');
  });

  it("should parse bold and italic inline", () => {
    const md = new MD();
    const input = "This is *italic* and **bold** text";
    const output = md.parse(input);
    expect(output).toContain('<em class="md-em">italic</em>');
    expect(output).toContain('<strong class="md-strong">bold</strong>');
  });

  it("should parse markdown links", () => {
    const md = new MD();
    const input = "Check [site](https://x.cz)";
    const output = md.parse(input);
    expect(output).toContain('<a href="https://x.cz" target="_blank">site</a>');
  });

  it("should parse images", () => {
    const md = new MD();
    const input = "![alt text](img.png)";
    const output = md.parse(input);
    expect(output).toContain('<img src="img.png" alt="alt text"');
  });

  it("should handle simple unordered list", () => {
    const md = new MD();
    const input = "* One\n* Two\n* Three";
    const output = md.parse(input);
    expect(output).toContain('<ul class="md-list"><li>One</li>');
    expect(output).toContain('</ul>');
  });

  it("should escape HTML inside code blocks", () => {
    const md = new MD();
    const input = "```\n<div>\n```";
    const output = md.parse(input);
    expect(output).toContain("&lt;div&gt;");
  });

  it("should handle inline code with backticks", () => {
    const md = new MD();
    const input = "Use `console.log()` here";
    const output = md.parse(input);
    expect(output).toContain('md-code-syntax-lang-general');
    expect(output).toContain('<pre class="inline');
  });

  it("should convert empty lines into <br />", () => {
    const md = new MD();
    const input = "Line one\n\nLine two";
    const output = md.parse(input);
    expect(output).toContain("<br />");
  });

  it("should handle empty code block", () => {
    const md = new MD();
    const input = "```\n```";
    const output = md.parse(input);
    expect(output).toContain("<pre"); // at least some pre tag
  });

  it("should parse GitHub-style markdown tables", () => {
    const md = new MD();
    const input = [
      "| A | B | C |",
      "|:-:|--:|---|",
      "| x | y | z |"
    ].join("\n");
    const output = md.parse(input);
    expect(output).toContain("<table");
    expect(output).toContain("<th align=\"center\"");
    expect(output).toContain("<td align=\"center\"");
  });

  it("should parse bracket-style extended tables", () => {
    const md = new MD({ mode: "extended" });
    const input = [
      "[One;Two;Three]",
      "1;2;3]"
    ].join("\n");
    const output = md.parse(input);
    expect(output).toContain("<table");
    expect(output).toContain("<th>One</th>");
    expect(output).toContain("<td>1</td>");
  });
});
