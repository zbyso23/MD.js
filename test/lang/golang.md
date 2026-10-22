```golang
package main

import (
	"fmt"
	"time"
)

// Ukázka struktury a metody
type User struct {
	Name string
}

func (u User) Greet() {
	fmt.Printf("Ahoj, jsem %s\n", u.Name)
}

// Funkce pro souběžné spuštění (goroutine)
func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		fmt.Printf("Worker %d zacal zpracovavat job %d\n", id, j)
		time.Sleep(time.Second) // Simulace práce
		fmt.Printf("Worker %d dokoncil job %d\n", id, j)
		results <- j * 2
	}
}

func main() {
	user := User{Name: "Jan"}
	user.Greet()

	// Kanály pro komunikaci mezi goroutinami
	jobs := make(chan int, 5)
	results := make(chan int, 5)

	// Spuštění goroutin (workerů)
	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	// Odeslání jobů
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)

	// Získání výsledků
	for a := 1; a <= 5; a++ {
		<-results
	}
}
```