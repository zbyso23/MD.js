```javascript
function markdownTest(str) {
  // Test vnořených uvozovek a regexu
  const regex = /(['"])(?:(?!\1|\\).|\\.)*?\1/g;
  const trickyString = "Tohle je řetězec s \"uniklou\" uvozovkou.";
  const anotherTricky = `Template string s 'jednoduchou' a "dvojitou" uvozovkou.`;
  
  if (str.includes("code")) {
    // Parser by neměl označit `code` jako klíčové slovo Pythonu
    console.log("Found 'code' but it's not a keyword.");
  }

  // Funkce, která by mohla být špatně označena
  function is_valid_name() {
    return true;
  }
}
```