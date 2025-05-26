# Database Understanding Guide

## 1. SQL Basic to Intermediate Queries

### Basic SQL Queries
```sql
-- Create Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Data
INSERT INTO users (username, email) VALUES 
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com');

-- Select Data
SELECT * FROM users;
SELECT username, email FROM users WHERE id = 1;

-- Update Data
UPDATE users SET email = 'new_email@example.com' WHERE username = 'john_doe';

-- Delete Data
DELETE FROM users WHERE id = 1;
```

### Intermediate SQL Queries
```sql
-- Joins
SELECT o.order_id, u.username, p.product_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;

-- Aggregations
SELECT 
    user_id,
    COUNT(*) as total_orders,
    SUM(amount) as total_spent,
    AVG(amount) as average_order
FROM orders
GROUP BY user_id
HAVING total_orders > 5;

-- Subqueries
SELECT username
FROM users
WHERE id IN (
    SELECT user_id 
    FROM orders 
    WHERE amount > 1000
);

-- Window Functions
SELECT 
    username,
    amount,
    RANK() OVER (ORDER BY amount DESC) as spending_rank
FROM users u
JOIN orders o ON u.id = o.user_id;
```

## 2. MongoDB Basic to Intermediate Queries

### Basic MongoDB Operations
```javascript
// Create Collection and Insert Documents
db.users.insertMany([
    {
        username: "john_doe",
        email: "john@example.com",
        created_at: new Date()
    },
    {
        username: "jane_smith",
        email: "jane@example.com",
        created_at: new Date()
    }
]);

// Find Documents
db.users.find({ username: "john_doe" });
db.users.find({ created_at: { $gt: new Date("2023-01-01") } });

// Update Documents
db.users.updateOne(
    { username: "john_doe" },
    { $set: { email: "new_email@example.com" } }
);

// Delete Documents
db.users.deleteOne({ username: "john_doe" });
```

### Intermediate MongoDB Operations
```javascript
// Aggregation Pipeline
db.orders.aggregate([
    {
        $match: { status: "completed" }
    },
    {
        $group: {
            _id: "$user_id",
            total_spent: { $sum: "$amount" },
            order_count: { $sum: 1 }
        }
    },
    {
        $sort: { total_spent: -1 }
    }
]);

// Complex Queries with Operators
db.products.find({
    $and: [
        { price: { $gt: 100 } },
        { stock: { $gt: 0 } },
        { category: { $in: ["electronics", "books"] } }
    ]
});

// Text Search
db.products.createIndex({ description: "text" });
db.products.find({ $text: { $search: "wireless headphones" } });
```

## 3. Database Design Real-Life Examples

### E-Commerce Database Design
```sql
-- Users Table
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    category_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Orders Table
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    order_date TIMESTAMP,
    total_amount DECIMAL(10,2),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Order Items Table (Junction Table)
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    price DECIMAL(10,2),
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**Design Explanation:**
- Normalized structure to avoid data redundancy
- Proper relationships using foreign keys
- Junction table for many-to-many relationships
- Appropriate data types for each column

## 4. Basic CRUD Operations Examples

### SQL CRUD Operations
```sql
-- Create (Insert)
INSERT INTO products (name, price, category_id) 
VALUES ('Laptop', 999.99, 1);

-- Read (Select)
SELECT * FROM products WHERE category_id = 1;

-- Update
UPDATE products 
SET price = 899.99 
WHERE name = 'Laptop';

-- Delete
DELETE FROM products WHERE name = 'Laptop';
```

### MongoDB CRUD Operations
```javascript
// Create
db.products.insertOne({
    name: "Laptop",
    price: 999.99,
    category_id: 1
});

// Read
db.products.find({ category_id: 1 });

// Update
db.products.updateOne(
    { name: "Laptop" },
    { $set: { price: 899.99 } }
);

// Delete
db.products.deleteOne({ name: "Laptop" });
```

## 5. Indexing Fundamentals

### SQL Indexing
```sql
-- Single Column Index
CREATE INDEX idx_username ON users(username);

-- Composite Index
CREATE INDEX idx_user_order ON orders(user_id, order_date);

-- Unique Index
CREATE UNIQUE INDEX idx_email ON users(email);

-- Partial Index
CREATE INDEX idx_active_users ON users(username) 
WHERE status = 'active';
```

### MongoDB Indexing
```javascript
// Single Field Index
db.users.createIndex({ "email": 1 });

// Compound Index
db.orders.createIndex({ "user_id": 1, "order_date": -1 });

// Text Index
db.products.createIndex({ "description": "text" });

// Geospatial Index
db.locations.createIndex({ "location": "2dsphere" });
```

**Index Types and Use Cases:**
1. **B-tree Indexes**
   - Default index type
   - Good for range queries
   - Efficient for sorting

2. **Hash Indexes**
   - Fast for equality comparisons
   - Not suitable for range queries
   - Memory efficient

3. **Text Indexes**
   - Full-text search capabilities
   - Language-specific features
   - Stop word removal

4. **Geospatial Indexes**
   - Location-based queries
   - Distance calculations
   - Area searches

## 6. Query Optimization Basics

### SQL Query Optimization
```sql
-- Using EXPLAIN to analyze query
EXPLAIN SELECT * FROM users 
WHERE username = 'john_doe';

-- Optimizing JOIN operations
SELECT u.username, o.order_id
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.amount > 1000;

-- Using appropriate indexes
CREATE INDEX idx_order_amount ON orders(amount);

-- Limiting result set
SELECT * FROM products 
WHERE category = 'electronics' 
LIMIT 10;
```

### MongoDB Query Optimization
```javascript
// Using explain() to analyze query
db.users.find({ username: "john_doe" }).explain();

// Using covered queries
db.users.createIndex({ username: 1, email: 1 });
db.users.find(
    { username: "john_doe" },
    { email: 1, _id: 0 }
);

// Using projection
db.products.find(
    { category: "electronics" },
    { name: 1, price: 1, _id: 0 }
);
```

**Optimization Techniques:**
1. **Index Usage**
   - Create appropriate indexes
   - Monitor index usage
   - Remove unused indexes

2. **Query Structure**
   - Use specific fields instead of *
   - Limit result set size
   - Use appropriate operators

3. **Performance Monitoring**
   - Use EXPLAIN/explain()
   - Monitor query execution time
   - Track resource usage

4. **Best Practices**
   - Regular maintenance
   - Proper data types
   - Efficient joins
   - Appropriate indexing 