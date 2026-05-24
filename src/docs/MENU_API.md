# Menu API Documentation

This document describes all the Menu API endpoints for managing restaurant menus and menu items.

## Base URL

```
/api/v1/restaurants/:restaurant_id/menus
```

---

## 📋 Menus Endpoints

### Get All Menus (Public)

**GET** `/:restaurant_id/menus`

Get all active menus for a restaurant.

**Query Parameters:**

- `include_inactive` (boolean, optional) - Include inactive menus (default: false)

**Response:**

```json
{
  "success": true,
  "message": "Restaurant menus fetched successfully",
  "data": {
    "restaurant_id": 1,
    "menus": [
      {
        "id": 1,
        "restaurant_id": 1,
        "name": "Lunch Menu",
        "description": "Daily lunch specials",
        "is_active": true,
        "sort_order": 0,
        "items": [
          {
            "id": 1,
            "menu_id": 1,
            "name": "Grilled Salmon",
            "description": "Fresh Atlantic salmon",
            "price": "18.99",
            "category": "Main",
            "is_available": true,
            "is_vegan": false,
            "is_vegetarian": false,
            "is_gluten_free": false,
            "sort_order": 0
          }
        ],
        "created_at": "2026-03-29T10:00:00Z",
        "updated_at": "2026-03-29T10:00:00Z"
      }
    ]
  }
}
```

---

### Get Menu with Items (Public)

**GET** `/:restaurant_id/menus/:menu_id`

Get a specific menu with all available items.

**Path Parameters:**

- `restaurant_id` (number, required) - Restaurant ID
- `menu_id` (number, required) - Menu ID

**Response:**

```json
{
  "success": true,
  "message": "Menu items fetched successfully",
  "data": {
    "id": 1,
    "restaurant_id": 1,
    "name": "Lunch Menu",
    "description": "Daily lunch specials",
    "is_active": true,
    "sort_order": 0,
    "items": [
      {
        "id": 1,
        "menu_id": 1,
        "name": "Grilled Salmon",
        "price": "18.99",
        "category": "Main",
        "is_available": true
      }
    ]
  }
}
```

---

### Create Menu (Owner or Admin)

**POST** `/:restaurant_id/menus`

Create a new menu for a restaurant.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)

**Request Body:**

```json
{
  "name": "Dinner Menu",
  "description": "Evening dining menu",
  "is_active": true,
  "sort_order": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Menu created successfully",
  "data": {
    "id": 2,
    "restaurant_id": 1,
    "name": "Dinner Menu",
    "description": "Evening dining menu",
    "is_active": true,
    "sort_order": 1,
    "items": [],
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}
```

---

### Update Menu (Owner or Admin)

**PUT** `/:restaurant_id/menus/:id`

Update a menu.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)
- `id` (number, required) - Menu ID

**Request Body:** (All fields optional)

```json
{
  "name": "Updated Menu Name",
  "description": "Updated description",
  "is_active": false,
  "sort_order": 2
}
```

**Response:**

```json
{
  "success": true,
  "message": "Menu updated successfully",
  "data": { ... }
}
```

---

### Delete Menu (Owner or Admin)

**DELETE** `/:restaurant_id/menus/:id`

Delete a menu and all its items.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)
- `id` (number, required) - Menu ID

**Request Body:**

```json
{
  "id": 2,
  "restaurant_id": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "Menu deleted successfully"
}
```

---

## 🍽️ Menu Items Endpoints

### Create Menu Item (Owner or Admin)

**POST** `/:restaurant_id/menus/:menu_id/items`

Add an item to a menu.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)
- `menu_id` (number, required)

**Request Body:**

```json
{
  "name": "Grilled Salmon",
  "description": "Fresh Atlantic salmon with lemon butter sauce",
  "price": 18.99,
  "image_url": "https://example.com/salmon.jpg",
  "category": "Main Course",
  "is_available": true,
  "is_vegan": false,
  "is_vegetarian": false,
  "is_gluten_free": true,
  "sort_order": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Menu item created successfully",
  "data": {
    "id": 1,
    "menu_id": 1,
    "name": "Grilled Salmon",
    "description": "Fresh Atlantic salmon with lemon butter sauce",
    "price": "18.99",
    "image_url": "https://example.com/salmon.jpg",
    "category": "Main Course",
    "is_available": true,
    "is_vegan": false,
    "is_vegetarian": false,
    "is_gluten_free": true,
    "sort_order": 1,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}
```

---

### Update Menu Item (Owner or Admin)

**PUT** `/:restaurant_id/menus/:menu_id/items/:id`

Update a menu item.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)
- `menu_id` (number, required)
- `id` (number, required) - Menu Item ID

**Request Body:** (All fields optional)

```json
{
  "name": "Grilled Atlantic Salmon",
  "price": 22.99,
  "is_available": true,
  "is_gluten_free": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Menu item updated successfully",
  "data": { ... }
}
```

---

### Delete Menu Item (Owner or Admin)

**DELETE** `/:restaurant_id/menus/:menu_id/items/:id`

Remove an item from a menu.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**

- `restaurant_id` (number, required)
- `menu_id` (number, required)
- `id` (number, required) - Menu Item ID

**Request Body:**

```json
{
  "id": 1,
  "menu_id": 1
}
```

**Response:**

```json
{
  "success": true,
  "message": "Menu item deleted successfully"
}
```

---

## 📊 Menu Item Fields

| Field          | Type    | Required | Description                                         |
| -------------- | ------- | -------- | --------------------------------------------------- |
| name           | string  | ✓        | Item name                                           |
| description    | string  | ✗        | Item description                                    |
| price          | number  | ✓        | Item price                                          |
| image_url      | string  | ✗        | Image URL                                           |
| category       | string  | ✗        | Category (e.g., "Appetizer", "Main", "Dessert")     |
| is_available   | boolean | ✗        | Whether item is currently available (default: true) |
| is_vegan       | boolean | ✗        | Dietary flag (default: false)                       |
| is_vegetarian  | boolean | ✗        | Dietary flag (default: false)                       |
| is_gluten_free | boolean | ✗        | Dietary flag (default: false)                       |
| sort_order     | number  | ✗        | Display order (default: 0)                          |

---

## 📊 Menu Fields

| Field       | Type    | Required | Description                            |
| ----------- | ------- | -------- | -------------------------------------- |
| name        | string  | ✓        | Menu name (e.g., "Lunch", "Dinner")    |
| description | string  | ✗        | Menu description                       |
| is_active   | boolean | ✗        | Whether menu is active (default: true) |
| sort_order  | number  | ✗        | Display order (default: 0)             |

---

## 🔐 Authorization

- **Public endpoints**: No authentication required (GET menus/items)
- **Protected endpoints**: Owner or Admin only
  - Owners can manage menus for their restaurants
  - Admins can manage menus for any restaurant

---

## ✅ Usage Examples

### Get All Menus

```bash
curl -X GET http://localhost:3001/api/v1/restaurants/1/menus
```

### Create Menu

```bash
curl -X POST http://localhost:3001/api/v1/restaurants/1/menus \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Breakfast Menu",
    "description": "Morning specials",
    "is_active": true
  }'
```

### Add Menu Item

```bash
curl -X POST http://localhost:3001/api/v1/restaurants/1/menus/1/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Eggs Benedict",
    "description": "Poached eggs with hollandaise sauce",
    "price": 12.99,
    "category": "Breakfast",
    "is_vegetarian": true
  }'
```

### Update Menu Item

```bash
curl -X PUT http://localhost:3001/api/v1/restaurants/1/menus/1/items/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 14.99,
    "is_available": true
  }'
```

### Delete Menu Item

```bash
curl -X DELETE http://localhost:3001/api/v1/restaurants/1/menus/1/items/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "menu_id": 1
  }'
```

---

## 🔄 Complete Workflow

1. **View Menus**: `/restaurants/1/menus` (public)
2. **View Items**: `/restaurants/1/menus/1` (public)
3. **Create Menu**: `POST /restaurants/1/menus` (owner/admin)
4. **Add Items**: `POST /restaurants/1/menus/1/items` (owner/admin)
5. **Update Item**: `PUT /restaurants/1/menus/1/items/1` (owner/admin)
6. **Manage**: `PUT/DELETE` by restaurant owner or admin

---

## 🚨 Error Handling

Common error responses:

**404 - Not Found**

```json
{
  "success": false,
  "message": "Menu not found",
  "code": "NOT_FOUND"
}
```

**403 - Forbidden**

```json
{
  "success": false,
  "message": "Not authorized to manage menus for this restaurant",
  "code": "FORBIDDEN"
}
```

**400 - Invalid Data**

```json
{
  "success": false,
  "message": "Invalid request body",
  "code": "VALIDATION_ERROR",
  "issues": [
    {
      "code": "too_small",
      "minimum": 0.01,
      "type": "number",
      "path": ["price"],
      "message": "Number must be greater than 0"
    }
  ]
}
```

---

## 📱 Mobile App Integration Example

```javascript
// Get menus for a restaurant
const getMenus = async (restaurantId) => {
  const response = await fetch(`/api/v1/restaurants/${restaurantId}/menus`);
  return response.json();
};

// Get specific menu items
const getMenuItems = async (restaurantId, menuId) => {
  const response = await fetch(
    `/api/v1/restaurants/${restaurantId}/menus/${menuId}`,
  );
  return response.json();
};

// Add to menu (admin/owner)
const addMenuItem = async (restaurantId, menuId, itemData, token) => {
  const response = await fetch(
    `/api/v1/restaurants/${restaurantId}/menus/${menuId}/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    },
  );
  return response.json();
};
```
