```csharp
using System;
using System.Threading.Tasks;

namespace MyApp
{
    public interface IWorker
    {
        Task DoWorkAsync();
    }

    public class Worker : IWorker
    {
        public string Name { get; set; }

        public Worker(string name)
        {
            Name = name;
        }

        public async Task DoWorkAsync()
        {
            Console.WriteLine($"Worker {Name} spouští práci...");
            await Task.Delay(1000);
            Console.WriteLine($"Worker {Name} dokončil práci.");
        }
    }

    public static class Program
    {
        public static async Task Main(string[] args)
        {
            Console.WriteLine("Spouštění aplikace...");
            IWorker worker = new Worker("Alice");
            await worker.DoWorkAsync();
            Console.WriteLine("Aplikace ukončena.");
        }
    }
}
```