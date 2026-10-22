```kotlin
import kotlinx.coroutines.*

data class User(val name: String, val age: Int)

fun String.prettyPrint(): String {
    return "--- $this ---"
}

fun main() = runBlocking {
    val user = User("Alice", 30)
    
    println("Uživatel: ${user.name}".prettyPrint())

    when {
        user.age >= 18 -> println("Uživatel je plnoletý.")
        else -> println("Uživatel je nezletilý.")
    }
    
    val users = listOf(user, User("Bob", 25))
    
    users.forEach {
        println("Jméno: ${it.name}")
    }

    // Příklad coroutine
    launch {
        delay(100L)
        println("Toto je coroutine!")
    }
    println("Čekání na coroutine...")
}
```