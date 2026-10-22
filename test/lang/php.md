```php
<?php
// Test PHP kódu s vnořenou HTML a řetězci s Markdown syntaxí
$var = 'Toto je \'testovací\' řetězec.';
$html = <<<HTML
  <div class="card">
    <p>Some **bold** text</p>
  </div>
HTML;

function testFunction() {
  $key = 'test';
  // Vnořený PHP kód
  echo "Hello, world! `{$key}`";
}
?>
```