```yaml
# YAML s vnořeným polem a řetězci
api:
  version: 1.0
  endpoints:
    - path: /users
      method: GET
      description: "Get all **users**"
    - path: /users/{id}
      method: GET
      description: "Get a single user by their `id`"
```
