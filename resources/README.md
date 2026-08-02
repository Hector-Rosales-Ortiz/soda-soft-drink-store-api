# Resources

Place shared project assets here.

## ERD.png

The Entity-Relationship Diagram belongs in this folder as `ERD.png`
(Renee / Database Engineer owns it — see the project guide).

Until the image is added, here is the schema it should illustrate
(created by [`setupDatabase.js`](../setupDatabase.js)):

```
users (1) ─── (1) carts (1) ─── (∞) cart_items (∞) ─── (1) products
  │                                                          │
  │ (1)                                                      │ (1)
  ▼ (∞)                                                      ▼ (∞)
orders (1) ─── (∞) order_items ────────────────────────────┘
```

| Table         | Key columns                                             | Relationships                           |
| ------------- | ------------------------------------------------------- | --------------------------------------- |
| `users`       | id, email, name, password_hash                          | has one cart, has many orders           |
| `products`    | id, name, price, stock, flavor, size                    | referenced by cart_items & order_items  |
| `carts`       | id, user_id (unique)                                    | belongs to a user, has many cart_items  |
| `cart_items`  | id, cart_id, product_id, quantity (unique cart+product) | belongs to cart & product               |
| `orders`      | id, user_id, total, status                              | belongs to a user, has many order_items |
| `order_items` | id, order_id, product_id, quantity, price               | belongs to order & product              |

```

```
