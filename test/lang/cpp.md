```cpp
#include <iostream>
#include <vector>
#include <memory>
#include <algorithm>

template <typename T>
class SmartArray {
private:
    std::vector<std::unique_ptr<T>> data;

public:
    void add(T val) {
        data.push_back(std::make_unique<T>(val));
    }

    void print() const {
        std::cout << "Obsah SmartArray:" << std::endl;
        for (const auto& item : data) {
            if (item) {
                std::cout << *item << " ";
            }
        }
        std::cout << std::endl;
    }
};

int main() {
    SmartArray<int> my_array;
    my_array.add(10);
    my_array.add(20);

    my_array.print();

    // Lambda výraz pro sečtení prvků
    auto sum = [=]() -> int {
        int total = 0;
        for (const auto& item : my_array.data) {
            if (item) {
                total += *item;
            }
        }
        return total;
    };

    std::cout << "Celkovy soucet: " << sum() << std::endl;

    return 0;
}

```