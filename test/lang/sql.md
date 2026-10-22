```sql
-- SQL dotaz s komentáři
-- Může obsahovat klíčová slova jako `SELECT` nebo `WHERE`
SELECT
  id,
  name,
  description
FROM
  users
WHERE
  status = 'aktivní' AND description LIKE '%**tučný**%';
```