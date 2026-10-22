```css
/* Test CSS komentářů s Markdown syntaxí */
.selector-test[data-attr="test"] {
  /* `!important` a jiné klíčové slova */
  border: 1px solid #000; /* border je také klíčové slovo */
  content: "This contains a `code` block.";
}

/* Test vnořených elementů */
@media (max-width: 600px) {
  body {
    background: url("images/test_image.jpg") !important;
  }
}
```