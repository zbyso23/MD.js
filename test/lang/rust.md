```rust
// Zákaz komentářů lint pro demonstrační účely
#![allow(dead_code)]

use std::error::Error;

trait Greeter {
    fn greet(&self);
}

struct Person {
    name: String,
}

impl Greeter for Person {
    fn greet(&self) {
        println!("Ahoj, jmenuji se {}!", self.name);
    }
}

async fn run_task(id: u32) -> Result<(), Box<dyn Error>> {
    println!("Spouštění úlohy s ID: {}", id);
    let person = Person { name: "Rust".to_string() };
    person.greet();
    Ok(())
}

fn main() {
    let person = Person { name: String::from("Rust") };
    person.greet();

    let runtime = tokio::runtime::Runtime::new().unwrap();
    runtime.block_on(async {
        run_task(1).await.unwrap();
    });
}
```