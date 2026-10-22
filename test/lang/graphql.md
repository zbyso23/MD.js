```graphql
query GetBlogPosts($first: Int!, $skip: Int = 0) {
  posts(first: $first, skip: $skip) {
    ...PostDetails
  }
}

mutation CreateNewPost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title @include(if: true)
  }
}

subscription NewPostAdded {
  postAdded {
    ...PostDetails
  }
}

fragment PostDetails on Post {
  id
  title
  body
  author {
    name
  }
}
```