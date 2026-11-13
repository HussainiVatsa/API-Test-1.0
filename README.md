# H+ Sport API and Client Student Starter

This folder is a clean, self-contained starting point for building a client that
uses the H+ Sport ASP.NET Core API. The dated lesson folders in the project root
are left unchanged.

## What is included

- `api/HussainiProject.API` — the API project copied from the latest lesson snapshot,
  with a CORS policy for the local client.
- `client` — a responsive, retail-inspired HTML, CSS, and JavaScript storefront
  that lists products and lets you add, edit, and delete them.

The API uses an in-memory database. Its sample products reset when the API
restarts; this is intentional for the starter exercise.

## Prerequisites

- The .NET 10 SDK.
- A browser and an editor such as Visual Studio Code.
- Python 3 to serve the client locally, or the VS Code Live Server extension.

## Step 1: Run the API

Open a terminal in this `StudentStarter` folder and run:

```powershell
dotnet run --project .\api\HussainiProject.API\HussainiProject.API.csproj --launch-profile HussainiProject.API
```

Keep this terminal open. The student launch profile uses `http://localhost:5233` and keeps local
development on HTTP so you do not need to configure an HTTPS certificate. The
API enforces HTTPS outside Development. Open
[http://localhost:5233/swagger](http://localhost:5233/swagger) to inspect and
try the API.

The client uses the HTTP address so local HTTPS certificate setup is not
required.

## Step 2: Understand the API

The `ProductsController` exposes these routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | Get all products |
| `GET` | `/api/products/{id}` | Get one product |
| `POST` | `/api/products` | Add a product |
| `PUT` | `/api/products/{id}` | Update a product |
| `DELETE` | `/api/products/{id}` | Delete one product |
| `GET` | `/api/categories` | Get product categories |

A product has `id`, `sku`, `name`, `description`, `price`, `isAvailable`,
`categoryId`, and `imageUrl` fields. Sample products with bundled photos use
their matching images in `client/images`. When adding or editing a product,
you can enter an HTTPS image URL or choose a JPG, PNG, GIF, or WebP image up to
1 MB from your device. Selected images are stored with the product as data URLs;
because the API uses an in-memory database, they reset when the API restarts.
Products without a product image are hidden from the collection. The API also
supports deleting multiple products through
`POST /api/products/Delete?ids=1&ids=2`.
Products also include an `options` array with a name and price for each size or
variant. The storefront opens product details when a product is selected and
lets shoppers add an available option to a browser-persistent demo cart. The
cart supports quantity changes, removal, and a subtotal; checkout and payment
are not implemented.
The client loads category names and IDs from `GET /api/categories` for its
Add/Edit forms and category filter.

Try `GET /api/products` in Swagger first. Confirm that the response is an array
of products before connecting a client.

## Step 3: Understand and configure CORS

Browsers restrict requests between different origins. An origin is the
combination of protocol, host, and port. The client served at
`http://localhost:5500` is a different origin from the API at
`http://localhost:5233`, so the API must allow it.

In `api/HussainiProject.API/Program.cs`, the `StudentClient` policy:

1. Allows the two local client origins (`localhost` and `127.0.0.1` on port
   `5500`).
2. Allows request headers and HTTP methods needed by the client.
3. Is applied before the authorization middleware and controller endpoints.

If you serve the client on a different port, add its exact origin to
`WithOrigins`. For example, `http://localhost:5501` is not covered by the
existing policy. Do not use `AllowAnyOrigin` as a shortcut for a deployed
application; allow only the origins you intend to trust.

## Step 4: Run the client

Open a second terminal in the `StudentStarter` folder and serve the client:

```powershell
py -m http.server 5500 --directory .\client
```

Then open [http://localhost:5500](http://localhost:5500). Alternatively, open
the `client` folder in VS Code and start Live Server on port `5500`.

The client is configured to call `http://localhost:5233/api/products`. If your
API is running on a different port, update `API_BASE_URL` near the top of
`client/app.js`.

## Step 5: Follow the client request

Read `client/app.js` and trace this sequence:

1. `loadProducts()` sends a `GET` request with `fetch`.
2. The browser sends the request to the API.
3. ASP.NET Core checks the CORS policy and routes it to `ProductsController`.
4. The controller returns JSON.
5. The client turns each product into DOM elements and displays it.

Selecting a product opens its details, including the available sizes or
variants and their prices. The Add form sends `POST` JSON with option names and
prices, and each product's Edit button opens a separate modal form that sends
`PUT` JSON to update it. The Delete button sends a `DELETE` request. The page
displays API errors instead of silently ignoring them. The search box and
category selector filter the products already loaded in the browser and can be
used together.

## Step 6: Build your own version

Use the working client as a starting point, then try these exercises:

1. Customize the storefront title, earthy color palette, editorial hero, and
   image-led product cards in `client/index.html` and `client/styles.css`.
2. The client searches loaded products and filters by categories loaded from
   `GET /api/categories`; the filters work together.
3. Edit products in the dedicated modal form and send a `PUT` request to
   `/api/products/{id}`.
4. Open product details, choose a size or variant, and add it to the cart.
   The cart is saved in this browser and shows quantities and a subtotal; it
   does not place orders or process payments.
5. Both product forms validate required text, field lengths, unique option
   names, nonnegative per-option prices with up to two decimal places,
   categories, and image URLs. Choose a local JPG, PNG, GIF, or WebP image up
   to 1 MB to preview and attach a photo. Try invalid values and check the
   field-specific messages.
6. Replace the in-memory database with a persistent database when you are ready
   to learn migrations and connection strings.

## Troubleshooting

- **CORS error in the browser:** check that the client origin exactly matches an
  entry in `WithOrigins`, including protocol and port. Restart the API after
  changing its CORS configuration.
- **Network error:** check that the API terminal is still running and that
  `API_BASE_URL` uses its current HTTP port.
- **Swagger does not open:** try `http://localhost:5233/swagger` while the API
  is running in its Development launch profile.
- **Products disappear after restart:** this starter uses an in-memory
  database. Data is not persisted.
