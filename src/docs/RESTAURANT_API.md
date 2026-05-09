# RESTAURANT MANAGEMENT API DOCUMENTATION

This document describes the restaurant API endpoints for TableSite.

## Base URL

All restaurant endpoints are mounted under:

`/api/v1/restaurants`

---

## Public Endpoints

### GET /api/v1/restaurants

List active restaurants with search, sorting, and pagination.

**Query Parameters**

- `search` - string, optional - Search in restaurant name, description, and cuisine
- `cuisine` - string, optional - Filter by cuisine type
- `location` - string, optional - Search in city, address, or state
- `date` - ISO datetime string, optional - Filter by availability date
- `minPrice` - number, optional - Minimum price range (deprecated, use priceRate)
- `maxPrice` - number, optional - Maximum price range (deprecated, use priceRate)
- `priceRate` - `low` | `medium` | `high`, optional - Filter by price range category
- `sortBy` - `popular` | `rated` | `newest` | `distance`, optional, default: `popular`
- `page` - number, optional, default: `1`
- `limit` - number, optional, default: `20`, max: `100`

**Response**

```json
{
  "success": true,
  "message": "Restaurants fetched successfully",
  "data": {
    "data": [
      /* Restaurant objects */
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### GET /api/v1/restaurants/:id

Get detailed restaurant information.

**Path Parameters**

- `id` - number

**Response**

```json
{
  "success": true,
  "message": "Restaurant detail fetched successfully",
  "data": {
    "id": 1,
    "name": "The Italian Kitchen",
    "slug": "the-italian-kitchen",
    "description": "Authentic Italian cuisine with wood-fired pizza and fresh pasta",
    "cuisine_type": "Italian",
    "address": "123 Main Street",
    "city": "New York",
    "average_rating": 4.8,
    "total_reviews": 120,
    "owner": {
      /* owner data */
    },
    "gallery_images": [
      /* photos */
    ],
    "tags": [
      /* tags */
    ],
    "amenities": [
      /* amenities */
    ],
    "operating_hours": [
      /* hours */
    ],
    "special_closures": [
      /* closures */
    ],
    "table_statistics": {
      "total_tables": 20,
      "available_tables": 12
    },
    "recent_reviews": [
      /* reviews */
    ],
    "is_favorited": false
  }
}
```

---

## Authenticated User Endpoints

### GET /api/v1/restaurants/favorites/list

Get the authenticated user's favorite restaurants.

**Headers**

- `Authorization: Bearer <token>`

**Query Parameters**

- `page` - number, optional, default: `1`
- `limit` - number, optional, default: `20`, max: `100`

**Response**

```json
{
  "success": true,
  "message": "Favorite restaurants fetched successfully",
  "data": {
    "data": [
      /* favorite restaurants */
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "pages": 1 }
  }
}
```

### POST /api/v1/restaurants/favorites/toggle

Add and Remove a restaurant to the user's favorites.

**Headers**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body**

```json
{
  "restaurant_id": 123
}
```

---

## Admin Endpoints

### POST /api/v1/restaurants/import

Import restaurants from a `.json` or `.csv` file.

This endpoint supports two request styles:

1. `multipart/form-data` upload (recommended)
2. raw JSON fallback with `fileName` and `fileContent`

**Headers**

- `Authorization: Bearer <admin_token>`
- `Content-Type: multipart/form-data`

**Multipart body**

- `file` - uploaded JSON or CSV file

**Raw JSON fallback**

```json
{
  "fileName": "restaurants.json",
  "fileContent": "[{\"name\": \"The Grill\", \"address\": \"123 Main St\", \"city\": \"New York\", \"country\": \"USA\"}]"
}
```

**Supported file formats**

- `.json` - array of restaurant objects
- `.csv` - comma-separated values with header row

**Example JSON file**

```json
[
  {
    "name": "The Grill",
    "slug": "the-grill",
    "description": "Steakhouse with premium cuts",
    "cuisine_type": "Steakhouse",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "phone": "+1234567890",
    "email": "info@grill.com",
    "website": "https://www.grill.com"
  }
]
```

**Example CSV file**

```csv
name,slug,cuisine_type,address,city,state,country,postal_code,phone,email,website,cover_image_url,latitude,longitude,min_booking_notice,max_booking_days,cancellation_hours,deposit_required,deposit_amount
The Grill,the-grill,Steakhouse,123 Main St,New York,NY,USA,10001,+1234567890,info@grill.com,https://www.grill.com,https://example.com/image.jpg,40.7128,-74.0060,60,30,24,true,50
```

**Example curl (multipart/form-data)**

```bash
curl -X POST http://localhost:3000/api/v1/restaurants/import \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@restaurants.json"
```

**Postman setup**

- Select `POST`
- Use URL: `http://localhost:3000/api/v1/restaurants/import`
- Set `Authorization` header
- In `Body`, choose `form-data`
- Add a key named `file`
- Set the type to `File`
- Select your JSON or CSV file

**Response**

```json
{
  "success": true,
  "message": "Restaurants imported successfully",
  "data": {
    "imported": 1,
    "total": 1,
    "restaurants": [{ "id": 123, "name": "The Grill", "slug": "the-grill" }],
    "errors": []
  }
}
```

### POST /api/v1/restaurants

Create a new restaurant (Admin only).

**Headers**

- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Body**

```json
{
  "name": "The Bistro",
  "slug": "the-bistro",
  "description": "Cozy neighborhood restaurant",
  "cuisine_type": "French",
  "address": "321 Elm St",
  "city": "Chicago",
  "state": "IL",
  "country": "USA",
  "postal_code": "60601",
  "phone": "+1333333333",
  "email": "contact@thebistro.com",
  "website": "https://www.thebistro.com",
  "cover_image_url": "https://example.com/image.jpg",
  "latitude": "41.8781",
  "longitude": "-87.6298",
  "min_booking_notice": 60,
  "max_booking_days": 30,
  "cancellation_hours": 24,
  "deposit_required": false,
  "deposit_amount": null
}
```

**Response**

```json
{
  "success": true,
  "message": "Restaurant created successfully",
  "data": {
    "id": 1,
    "name": "The Bistro",
    "slug": "the-bistro",
    "status": "PENDING_APPROVAL",
    "owner": {
      /* owner info */
    }
  }
}
```

### PUT /api/v1/restaurants/:id

Update a restaurant (Owner or Admin only).

**Headers**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Path Parameters**

- `id` - number

**Body**

Any writable restaurant fields. Example:

```json
{
  "name": "Updated Restaurant Name",
  "phone": "+1999999999",
  "website": "https://www.updated.com"
}
```

**Response**

```json
{
  "success": true,
  "message": "Restaurant updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Restaurant Name",
    "slug": "updated-restaurant-name",
    "status": "PENDING_APPROVAL",
    "owner": {
      /* owner info */
    }
  }
}
```

### PUT /api/v1/restaurants/:id/status

Update restaurant status (Admin only).

**Headers**

- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Path Parameters**

- `id` - number

**Body**

```json
{
  "id": 1,
  "status": "ACTIVE"
}
```

**Valid status values**

- `ACTIVE` - Approve the restaurant (make it active)
- `CLOSED` - Close the restaurant

**Response**

```json
{
  "success": true,
  "message": "Restaurant status updated successfully",
  "data": {
    "id": 1,
    "name": "The Bistro",
    "slug": "the-bistro",
    "status": "ACTIVE",
    "owner": {
      /* owner info */
    }
  }
}
```

### DELETE /api/v1/restaurants/:id

Permanently delete a restaurant from the database.

**Headers**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Path Parameters**

- `id` - number

**Body**

```json
{
  "id": 1
}
```

**Response**

```json
{
  "success": true,
  "message": "Restaurant deleted successfully"
}
```

---

## cURL Examples

### List restaurants

```bash
curl -X GET "http://localhost:3000/api/v1/restaurants?page=1&limit=20" \
  -H "Accept: application/json"
```

### Get restaurant details

```bash
curl -X GET "http://localhost:3000/api/v1/restaurants/1" \
  -H "Accept: application/json"
```

### Get favorite restaurants

```bash
curl -X GET "http://localhost:3000/api/v1/restaurants/favorites/list?page=1&limit=20" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

### Add favorite restaurant

```bash
curl -X POST "http://localhost:3000/api/v1/restaurants/favorites/add" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": 123}'
```

### Remove favorite restaurant

```bash
curl -X POST "http://localhost:3000/api/v1/restaurants/favorites/remove" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": 123}'
```

### Import restaurants (multipart/form-data)

```bash
curl -X POST "http://localhost:3000/api/v1/restaurants/import" \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@restaurants.json"
```

### Create a restaurant

```bash
curl -X POST "http://localhost:3000/api/v1/restaurants" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"The Bistro","slug":"the-bistro","description":"Cozy neighborhood restaurant","cuisine_type":"French","address":"321 Elm St","city":"Chicago","state":"IL","country":"USA","postal_code":"60601","phone":"+1333333333","email":"contact@thebistro.com","website":"https://www.thebistro.com","cover_image_url":"https://example.com/image.jpg","latitude":"41.8781","longitude":"-87.6298","min_booking_notice":60,"max_booking_days":30,"cancellation_hours":24,"deposit_required":false,"deposit_amount":null}'
```

### Update a restaurant

```bash
curl -X PUT "http://localhost:3000/api/v1/restaurants/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Restaurant Name","phone":"+1999999999","website":"https://www.updated.com"}'
```

### Update restaurant status

```bash
curl -X PUT "http://localhost:3000/api/v1/restaurants/1/status" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"id":1,"status":"ACTIVE"}'
```

### Delete a restaurant

```bash
curl -X DELETE "http://localhost:3000/api/v1/restaurants/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"id":1}'
```
