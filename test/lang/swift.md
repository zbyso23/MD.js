```swift
import Foundation

enum APIError: Error {
    case invalidURL
    case serverError(Int)
}

struct User: Decodable {
    let id: Int
    let name: String
    let email: String?
}

class UserService {
    func fetchUser(by id: Int) async throws -> User {
        let urlString = "https://api.example.com/users/\(id)"
        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        return try JSONDecoder().decode(User.self, from: data)
    }
}

@main
struct App {
    static func main() async {
        let userService = UserService()
        do {
            let user = try await userService.fetchUser(by: 123)
            print("Uživatel nalezen: \(user.name)")
        } catch {
            print("Došlo k chybě: \(error)")
        }
    }
}
```