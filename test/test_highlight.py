# --- TEST: Standard Python ---
def hello_world():
    print("Hello, world!")  # Comment with string
    return True if 42 else False
# --- TEST: NumPy ---
import numpy as np
# Creating an array
arr = np.array([1, 2, 3, 4, 5])
zeros = np.zeros((3, 3))
ones = np.ones((2, 2))
random_arr = np.random.rand(4, 4)
# Operations
reshaped = arr.reshape(5, 1)
sum_arr = np.sum(arr)
mean_val = np.mean(arr)
# Saving and loading
np.savetxt("output.txt", arr)
loaded = np.loadtxt("output.txt")
# --- TEST: FastAPI ---
from fastapi import FastAPI, Depends, Query, Path, Body, HTTPException
from fastapi.responses import JSONResponse
app = FastAPI()
@app.get("/items/{item_id}")
async def read_item(
    item_id: int = Path(..., title="Item ID"),
    q: str = Query(None, min_length=3),
    body: dict = Body(...)
) :
    if item_id == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return JSONResponse({„item_id“: item_id, ‚q‘: q, „body“: body})
# --- TEST: PyTorch ---
import torch
import torch.nn as nn
import torch.optim as optim

# Creating tensors
tensor = torch.tensor([1.0, 2.0, 3.0])
zeros_tensor = torch.zeros(3, 3)
random_tensor = torch.rand(4, 4)

# Operations
reshaped_tensor = tensor.reshape(3, 1)
sum_tensor = torch.sum(tensor)

# Neural network
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.linear = nn.Linear(10, 1)

    def forward(self, x):
        return self.linear(x)

model = SimpleNN()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Saving and loading a model
torch.save(model.state_dict(), "model.pth")
model.load_state_dict(torch.load("model.pth"))

# --- TEST: Mixed constructions ---
# Combination of Python, NumPy, FastAPI, and PyTorch
def mixed_example():
    data = np.random.rand(10, 10)
    tensor_data = torch.from_numpy(data)
    result = {"numpy_sum": np.sum(data), "torch_sum": torch.sum(tensor_data)}
    return JSONResponse(result)

# --- TEST: Strings and symbols ---
single_quoted = 'This is a string in single quotes'
double_quoted = "This is a string in double quotes"
triple_quoted = """This is a
multi-line
string"""

# --- TEST: Comments ---
# Single-line comment
"""
Multi-line
comment (docstring)
"""

# --- TEST: Special cases ---
with open("file.txt", "r") as f:
    content = f.read()

async def async_example():
    await some_coroutine()
