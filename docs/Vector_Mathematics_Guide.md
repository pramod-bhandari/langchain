# Vector Mathematics Guide

## 1. Vector Operations

### Vector Addition
```python
import numpy as np

# Vector Addition
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
result = v1 + v2  # [5, 7, 9]

# Geometric Interpretation
# - Place vectors head to tail
# - Result is vector from start of first to end of second
```

### Vector Subtraction
```python
# Vector Subtraction
v1 = np.array([4, 5, 6])
v2 = np.array([1, 2, 3])
result = v1 - v2  # [3, 3, 3]

# Geometric Interpretation
# - Reverse second vector
# - Add to first vector
```

### Vector Multiplication
```python
# Scalar Multiplication
v = np.array([1, 2, 3])
scalar = 2
result = v * scalar  # [2, 4, 6]

# Element-wise Multiplication (Hadamard Product)
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
result = v1 * v2  # [4, 10, 18]
```

## 2. Dot Product and Cross Product

### Dot Product (Scalar Product)
```python
# Dot Product
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
dot_product = np.dot(v1, v2)  # 1*4 + 2*5 + 3*6 = 32

# Properties:
# - Commutative: a·b = b·a
# - Distributive: a·(b+c) = a·b + a·c
# - Scalar multiplication: (ka)·b = k(a·b)

# Applications:
# - Projection of one vector onto another
# - Measuring similarity between vectors
# - Calculating angles between vectors
```

### Cross Product (Vector Product)
```python
# Cross Product (3D vectors only)
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
cross_product = np.cross(v1, v2)

# Properties:
# - Anti-commutative: a×b = -(b×a)
# - Distributive: a×(b+c) = a×b + a×c
# - Scalar multiplication: (ka)×b = k(a×b)

# Applications:
# - Finding normal vectors
# - Calculating torque
# - Determining orientation
```

## 3. Vector Normalization

### Normalization Process
```python
def normalize_vector(v):
    # Calculate magnitude
    magnitude = np.sqrt(np.sum(v**2))
    # Return normalized vector
    return v / magnitude

# Example
v = np.array([3, 4, 0])
normalized_v = normalize_vector(v)  # [0.6, 0.8, 0]

# Properties of Normalized Vectors:
# - Magnitude = 1
# - Direction remains unchanged
# - Useful for:
#   * Comparing directions
#   * Simplifying calculations
#   * Machine learning applications
```

## 4. Distance Metrics

### Euclidean Distance
```python
def euclidean_distance(v1, v2):
    return np.sqrt(np.sum((v1 - v2)**2))

# Example
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
distance = euclidean_distance(v1, v2)

# Properties:
# - Always non-negative
# - Symmetric
# - Satisfies triangle inequality
# - Most common distance metric
```

### Manhattan Distance
```python
def manhattan_distance(v1, v2):
    return np.sum(np.abs(v1 - v2))

# Example
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
distance = manhattan_distance(v1, v2)

# Properties:
# - Also called "city block" distance
# - Sum of absolute differences
# - Useful for:
#   * Grid-based movements
#   * Feature selection
#   * Clustering algorithms
```

### Cosine Distance
```python
def cosine_distance(v1, v2):
    # Convert to cosine similarity first
    dot_product = np.dot(v1, v2)
    norm_v1 = np.sqrt(np.sum(v1**2))
    norm_v2 = np.sqrt(np.sum(v2**2))
    cosine_similarity = dot_product / (norm_v1 * norm_v2)
    # Convert to distance
    return 1 - cosine_similarity

# Example
v1 = np.array([1, 2, 3])
v2 = np.array([4, 5, 6])
distance = cosine_distance(v1, v2)

# Properties:
# - Measures angle between vectors
# - Range: [0, 2]
# - Useful for:
#   * Text similarity
#   * Document clustering
#   * Recommendation systems
```

## Practical Applications

### 1. Machine Learning
```python
# Feature Normalization
def normalize_features(X):
    return (X - X.mean()) / X.std()

# Similarity Calculation
def calculate_similarity(v1, v2, metric='cosine'):
    if metric == 'cosine':
        return 1 - cosine_distance(v1, v2)
    elif metric == 'euclidean':
        return 1 / (1 + euclidean_distance(v1, v2))
    elif metric == 'manhattan':
        return 1 / (1 + manhattan_distance(v1, v2))
```

### 2. Computer Graphics
```python
# Normal Vector Calculation
def calculate_normal(v1, v2, v3):
    # Calculate two vectors in the plane
    vector1 = v2 - v1
    vector2 = v3 - v1
    # Calculate cross product
    normal = np.cross(vector1, vector2)
    # Normalize
    return normalize_vector(normal)
```

### 3. Physics Simulations
```python
# Force Calculation
def calculate_force(mass, acceleration):
    return mass * acceleration

# Velocity Update
def update_velocity(velocity, acceleration, time):
    return velocity + (acceleration * time)
```

## Best Practices

1. **Vector Operations**
   - Use numpy for efficient calculations
   - Check vector dimensions before operations
   - Handle edge cases (zero vectors, etc.)

2. **Distance Metrics**
   - Choose appropriate metric for your use case
   - Normalize vectors when necessary
   - Consider computational complexity

3. **Performance Optimization**
   - Use vectorized operations
   - Avoid loops when possible
   - Consider memory usage for large vectors

4. **Numerical Stability**
   - Handle floating-point errors
   - Use appropriate precision
   - Check for division by zero 