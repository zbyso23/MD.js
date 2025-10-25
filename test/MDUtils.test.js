import { describe, it, expect } from "vitest";
import { MDUtils } from "../MD.mjs";

describe("MDUtils", () => {
  it("unHTML() should replace HTML-sensitive characters", () => {
    const input = "<div>{abc}</div>:$";
    const expected = "&lt;div&gt;&#123;abc&#125;&lt;/div&gt;&#58;&#36;";
    expect(MDUtils.unHTML(input)).toBe(expected);
  });

  it("processLinksItem() should replace markdown links with <a>", () => {
    const input = "Check [site](https://x.cz)";
    const result = MDUtils.processLinksItem(input);
    expect(result).toContain('<a href="https://x.cz" target="_blank">site</a>');
  });

  it("processLinksItem() should ignore lines without links", () => {
    const input = "Just plain text";
    const result = MDUtils.processLinksItem(input);
    expect(result).toBe(input);
  });

  it("parseLinks() should process all lines", () => {
    const lines = [
      "Link [one](https://a.com)",
      "No link here",
      "[two](https://b.com)",
    ];
    const result = MDUtils.parseLinks(lines);
    expect(result[0]).toContain("a.com");
    expect(result[1]).toBe("No link here");
    expect(result[2]).toContain("b.com");
  });

  it("processImagesItem() should replace markdown image with <img>", () => {
    const input = "![Alt text](pic.png)";
    const result = MDUtils.processImagesItem(input, "img-cls");
    expect(result).toContain('<img src="pic.png" alt="Alt text" class="img-cls" />');
  });

  it("processImagesItem() should ignore lines without image syntax", () => {
    const input = "Hello world";
    expect(MDUtils.processImagesItem(input, "img")).toBe(input);
  });

  it("codeHighlighterGeneral() should unescape HTML in code lines", () => {
    const lines = ["<div>", "a<b>c</b>"];
    const result = MDUtils.codeHighlighterGeneral("general", lines);
    // HTML escaped
    expect(result[0]).toContain("&lt;div&gt;");
    expect(result[1]).toContain("&lt;b&gt;");
  });
});
