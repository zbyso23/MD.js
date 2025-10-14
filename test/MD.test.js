import { describe, it, expect } from "vitest";
import { MD } from "../MD.js";

describe("MD core parser", () => {
  it("should parse headers (#, ##, ###, ####)", () => {
    const md = new MD();
    const input = "# Title\n## Subtitle\n### Sub\n#### Mini";
    const output = md.parse(input);
    expect(output).toContain('<h1 class="md-header">Title</h1>');
    expect(output).toContain('<h2 class="md-header">Subtitle</h2>');
    expect(output).toContain('<h3 class="md-header">Sub</h3>');
    expect(output).toContain('<h4 class="md-header">Mini</h4>');
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

it("should correctly parse GitHub-style markdown tables with alignment and classes", () => {
  const md = new MD();

  const input = [
    "| Name | Age | Country |",
    "|:-----|:---:|----:|",
    "| Ali | 32 | Turkey |",
    "| Sara | 28 | Egypt |",
  ].join("\n");

  const output = md.parse(input);

  expect(output).toContain(`<table class="table md-table table-striped table-hover"><tr><th align="left" class="text-left">Name</th><th align="center" class="text-center">Age</th><th align="right" class="text-right">Country</th></tr><br />
<tr><td align="left" class="text-left">Ali</td><td align="center" class="text-center">32</td><td align="right" class="text-right">Turkey</td></tr><br />
<tr><td align="left" class="text-left">Sara</td><td align="center" class="text-center">28</td><td align="right" class="text-right">Egypt</td></tr></table><br />`);

  // 🔹 základní struktura
  expect(output).toContain('<table class="table md-table table-striped table-hover">');
  expect(output).toContain("</table>");
  expect(output).toMatch(/<tr>/);
  expect(output).toMatch(/<\/tr>/);

  // 🔹 hlavičky a zarovnání
  expect(output).toContain('<th align="left" class="text-left">Name</th>');
  expect(output).toContain('<th align="center" class="text-center">Age</th>');
  expect(output).toContain('<th align="right" class="text-right">Country</th>');

  // 🔹 datové buňky
  expect(output).toMatch(/<td [^>]+>Ali<\/td>/g);

  // 🔹 počty buněk
  const thCount = (output.match(/<th /g) || []).length;
  const tdCount = (output.match(/<td [^>]+>/g) || []).length;
  expect(thCount).toBe(3);
  expect(tdCount).toBe(6);

  // 🔹 uzavření tabulky na konci
  expect(output.trim().endsWith("</table><br />")).toBe(true);
});


  it("should parse extended bracket tables (both closed and open variants)", () => {
    const md = new MD({ mode: "extended" });

    const inputClosed = [
      "[Name; Age; Country]",
      "Ali; 32; Turkey]",
      "Sara; 28; Egypt]",
    ].join("\n");

    const inputOpen = [
      "[Product; Price; In stock",
      "Apples; 12.5; Yes",
      "Bananas; 8.99; No",
    ].join("\n");

    const outputClosed = md.parse(inputClosed);
    const outputOpen = md.parse(inputOpen);

    expect(outputClosed).toContain(`<table class="table md-table table-striped table-hover"><tr><th>Name</th><th>Age</th><th>Country</th></tr><br />
<tr><td>Ali</td><td>32</td><td>Turkey</td></tr><br />
<tr><td>Sara</td><td>28</td><td>Egypt</td></tr><br />
</table><br />`);
    expect(outputOpen).toContain(`<table class="table md-table table-striped table-hover"><tr><th>Product</th><th>Price</th><th>In stock</th></tr><br />
<tr><td>Apples</td><td>12.5</td><td>Yes</td></tr><br />
<tr><td>Bananas</td><td>8.99</td><td>No</td></tr><br />
</table><br />`);

    expect(outputClosed).toContain("<table");
    expect(outputClosed).toContain("<th>Name</th>");
    expect(outputClosed).toContain("<td>Turkey</td>");

    expect(outputOpen).toContain("<table");
    expect(outputOpen).toContain("<th>Product</th>");
    expect(outputOpen).toContain("<td>Apples</td>");

    const tdCountClosed = (outputClosed.match(/<td/g) || []).length;
    const tdCountOpen = (outputOpen.match(/<td/g) || []).length;
    expect(tdCountClosed).toBe(6);
    expect(tdCountOpen).toBe(6);

    expect(outputClosed).toContain("</table>");
    expect(outputOpen).toContain("</table>");
  });
});
