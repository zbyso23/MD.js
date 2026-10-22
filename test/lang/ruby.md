```ruby
# app/concepts/post/operation/create.rb
module Post::Operation
  class Create < Trailblazer::Operation
    step Model(Post, :new)
    step Contract::Build(constant: Post::Contract::Create)
    step Contract::Validate()
    step Contract::Persist()

    def persist(options, model:, **)
      model.save
    end
  end
end

# app/concepts/post/contract/create.rb
module Post::Contract
  class Create < Reform::Form
    property :title
    property :body
    property :tags, prepopulator: ->(_) { self.tags = [Tag.new] }

    validates :title, presence: true, length: { minimum: 5 }
    validates :body, presence: true
  end
end

# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  def new
    @form = Post::Operation::Create.call({}).contract
  end

  def create
    result = Post::Operation::Create.call(params[:post])
    if result.success?
      redirect_to post_path(result.model)
    else
      @form = result.contract
      render :new
    end
  end
end
```