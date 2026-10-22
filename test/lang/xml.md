```xml
<!-- XML s vnořeným komentářem -->
<root>
  <element attr="hodnota">
    <nested-element>
      <![CDATA[
        // Tento obsah má být ignorován parserem Markdownu
        <p>This is a <p>tag.</p> It should not be parsed.</p>
      ]]>
    </nested-element>
  </element>
</root>
```