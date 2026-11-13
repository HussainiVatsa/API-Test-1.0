// The API address used to load, add, edit, and delete products.
const API_BASE_URL = "http://localhost:5233/api";
const PRODUCTS_API_URL = `${API_BASE_URL}/products`;
const CATEGORIES_API_URL = `${API_BASE_URL}/categories`;

// Find the page elements this script needs to use.
const productForm = document.querySelector("#product-form");
const editProductForm = document.querySelector("#edit-product-form");
const editProductDialog = document.querySelector("#edit-product-dialog");
const editProductHeading = document.querySelector("#edit-product-heading");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const productDetailDialog = document.querySelector("#product-detail-dialog");
const productDetailForm = document.querySelector("#product-detail-form");
const productOptionSelect = document.querySelector("#product-option-select");
const productQuantityInput = document.querySelector("#product-quantity");
const productDetailImage = document.querySelector("[data-product-detail-image]");
const productDetailCategory = document.querySelector("[data-product-detail-category]");
const productDetailName = document.querySelector("[data-product-detail-name]");
const productDetailSku = document.querySelector("[data-product-detail-sku]");
const productDetailDescription = document.querySelector("[data-product-detail-description]");
const productDetailPrice = document.querySelector("[data-product-detail-price]");
const productDetailStock = document.querySelector("[data-product-detail-stock]");
const addToCartButton = document.querySelector("#add-to-cart-button");
const closeProductDetailButton = document.querySelector("#close-product-detail");
const cartDialog = document.querySelector("#cart-dialog");
const cartToggleButton = document.querySelector("#cart-toggle");
const cartCount = document.querySelector("#cart-count");
const cartItemsContainer = document.querySelector("#cart-items");
const cartEmptyMessage = document.querySelector("#cart-empty");
const cartSubtotal = document.querySelector("#cart-subtotal");
const closeCartButton = document.querySelector("#close-cart");
const productsContainer = document.querySelector("#products");
const statusMessage = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh-button");
const searchInput = document.querySelector("#product-search");
const categoryFilter = document.querySelector("#category-filter");
let loadedProducts = [];
let loadedCategories = [];
let categoryLoadError = "";
let editingProductId = null;
let detailProductId = null;
let originalEditFormValues = null;
let originalEditImageUrl = "";
let cartItems = [];
let cartStorageError = "";
let optionRowCounter = 0;
const CART_STORAGE_KEY = "retro-active-cart";
const MAX_PRODUCT_IMAGE_SIZE = 1024 * 1024;
const SUPPORTED_PRODUCT_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const PRODUCT_IMAGES_BY_CATEGORY = {
  1: "images/apparel.svg",
  2: "images/apparel.svg",
  3: "images/water.svg",
  4: "images/publication.svg",
  5: "images/supplements.svg",
  default: "images/sport.svg"
};
const PRODUCT_IMAGES_BY_SKU = {
  AWMGSJ: "images/Grunge Skater Jeans (Men) - AWMGSJ.jpg",
  AWMPS: "images/Polo Shirt (Men) - AWMPS.jpg",
  AWMSGT: "images/Skater Graphic T-Shirt (Men) - AWMSGT.jpg",
  AWMSJ: "images/Slicker Jacket (Men) - AWMSJ.jpg",
  AWMVNS: "images/V-Neck Sweater (Men) - AWMVNS.jpg",
  AWWSDP: "images/Stretchy Dance Pants (Women) - AWWSDP.jpg",
  AWWVNT: "images/V-Neck T-Shirt (Women) - AWWVNT.jpg",
  MWB: "images/Blueberry Mineral Water - MWB.jpg",
  PITK: "images/In the Kitchen with H+ Sport - PITK.jpg",
  SC400: "images/Calcium 400 IU (150 tablets) - SC400.jpg",
  SMV: "images/Multi-Vitamin (90 capsules) - SMV.jpg",
  SVD3: "images/Vitamin D3 1000 IU (100 tablets) - SVD3.jpg"
};
const PRODUCT_IMAGE_PATHS = new Set([
  ...Object.values(PRODUCT_IMAGES_BY_CATEGORY),
  ...Object.values(PRODUCT_IMAGES_BY_SKU)
]);
const PRODUCT_FORM_FIELDS = [
  "sku",
  "name",
  "description",
  "categoryId",
  "imageUrl",
  "imageFile"
];

function isEmbeddedProductImage(value) {
  return typeof value === "string" &&
    /^data:image\/(?:gif|jpeg|png|webp);base64,/i.test(value);
}

function getProductImageUrl(product) {
  if (isEmbeddedProductImage(product?.imageUrl)) {
    return product.imageUrl;
  }

  if (PRODUCT_IMAGE_PATHS.has(product.imageUrl)) {
    return product.imageUrl;
  }

  try {
    const imageUrl = new URL(product.imageUrl);
    if (imageUrl.protocol === "https:") {
      return imageUrl.href;
    }
  } catch {
    // Fall through to the bundled image for known sample products.
  }

  return product?.sku ? PRODUCT_IMAGES_BY_SKU[product.sku] || null : null;
}

function getImageUrlFromForm(value) {
  const imageUrl = value.trim();
  if (!imageUrl) {
    return "";
  }

  if (PRODUCT_IMAGE_PATHS.has(imageUrl)) {
    return imageUrl;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("Image URL must be a listed local image path or a valid HTTPS URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("External product images must use HTTPS.");
  }

  return parsedUrl.href;
}

function getEditFormValues() {
  return getProductFormValues(editProductForm);
}

function getOptionRows(form) {
  return [...form.querySelectorAll("[data-option-row]")];
}

function readOptionValues(form) {
  return getOptionRows(form).map((row) => ({
    name: row.querySelector("[data-option-name]").value.trim(),
    price: row.querySelector("[data-option-price]").value.trim()
  }));
}

function getDefaultOptionNames(categoryId) {
  if (Number(categoryId) === 1 || Number(categoryId) === 2) {
    return ["XS", "S", "M", "L", "XL", "XXL"];
  }
  if (Number(categoryId) === 3) {
    return ["500 ml", "1 L"];
  }
  if (Number(categoryId) === 4) {
    return ["Standard"];
  }
  return ["Package"];
}

function createOptionRow(form, option = {}) {
  const row = document.createElement("div");
  row.className = "option-row";
  row.dataset.optionRow = "";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Size / option";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 80;
  nameInput.required = true;
  nameInput.value = option.name || "";
  nameInput.dataset.optionName = "";
  const nameError = document.createElement("span");
  nameError.className = "field-error";
  nameError.dataset.optionNameError = "";
  nameError.setAttribute("aria-live", "polite");
  nameLabel.append(nameInput, nameError);

  const priceLabel = document.createElement("label");
  priceLabel.textContent = "Price";
  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.min = "0";
  priceInput.step = "0.01";
  priceInput.required = true;
  priceInput.value = option.price ?? "";
  priceInput.dataset.optionPrice = "";
  const priceError = document.createElement("span");
  priceError.className = "field-error";
  priceError.dataset.optionPriceError = "";
  priceError.setAttribute("aria-live", "polite");
  priceLabel.append(priceInput, priceError);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "option-row__remove";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove ${option.name || "option"}`);
  removeButton.addEventListener("click", () => {
    row.remove();
    form.dataset.optionsCustomized = "true";
    if (form.dataset.validationAttempted === "true") {
      validateProductForm(form);
    }
  });

  nameInput.addEventListener("input", () => {
    removeButton.setAttribute(
      "aria-label",
      `Remove ${nameInput.value.trim() || "option"}`
    );
    form.dataset.optionsCustomized = "true";
  });
  priceInput.addEventListener("input", () => {
    form.dataset.optionsCustomized = "true";
  });

  row.append(nameLabel, priceLabel, removeButton);
  return row;
}

function populateOptionRows(form, options) {
  const list = form.querySelector("[data-option-list]");
  list.replaceChildren(...options.map((option) => createOptionRow(form, option)));
  form.dataset.optionsCustomized = "false";
  const error = form.querySelector('[data-validation-for="options"]');
  error.textContent = "";
}

function getProductOptions(product) {
  if (Array.isArray(product?.options) && product.options.length > 0) {
    return product.options.map((option) => ({
      id: option.id,
      name: option.name,
      price: Number(option.price)
    }));
  }
  return [{ id: 0, name: "Standard", price: Number(product?.price || 0) }];
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function getProductFormValues(form) {
  return {
    sku: form.elements.sku.value,
    name: form.elements.name.value,
    description: form.elements.description.value,
    options: readOptionValues(form),
    categoryId: form.elements.categoryId.value,
    imageUrl: form.elements.imageUrl.value,
    imageFile: form.elements.imageFile.files[0]
      ? [
          form.elements.imageFile.files[0].name,
          form.elements.imageFile.files[0].size,
          form.elements.imageFile.files[0].lastModified
        ].join(":")
      : "",
    isAvailable: form.elements.isAvailable.checked
  };
}

function getProductFormErrors(form) {
  const errors = {};
  const values = getProductFormValues(form);

  for (const [fieldName, label, maxLength, requiredMessage] of [
    ["sku", "SKU", 40, "Enter a SKU."],
    ["name", "Name", 120, "Enter a name."],
    ["description", "Description", 300, "Enter a description."]
  ]) {
    const value = values[fieldName].trim();
    if (!value) {
      errors[fieldName] = requiredMessage;
    } else if (value.length > maxLength) {
      errors[fieldName] = `${label} must be ${maxLength} characters or fewer.`;
    }
  }

  const optionErrors = [];
  const optionNames = new Set();
  const optionRows = getOptionRows(form);
  if (optionRows.length === 0) {
    errors.options = "Add at least one size or option.";
  }

  for (const row of optionRows) {
    const nameInput = row.querySelector("[data-option-name]");
    const priceInput = row.querySelector("[data-option-price]");
    const name = nameInput.value.trim();
    const priceText = priceInput.value.trim();
    const rowErrors = {};

    if (!name) {
      rowErrors.name = "Enter a size or option.";
    } else if (name.length > 80) {
      rowErrors.name = "Use 80 characters or fewer.";
    } else if (optionNames.has(name.toLocaleLowerCase())) {
      rowErrors.name = "Option names must be unique.";
    } else {
      optionNames.add(name.toLocaleLowerCase());
    }

    if (!priceText) {
      rowErrors.price = "Enter a price.";
    } else if (priceInput.validity.badInput || !Number.isFinite(Number(priceText))) {
      rowErrors.price = "Enter a valid price.";
    } else if (Number(priceText) < 0) {
      rowErrors.price = "Price cannot be negative.";
    } else if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(priceText)) {
      rowErrors.price = "Use no more than two decimal places.";
    }

    optionErrors.push(rowErrors);
  }

  if (optionErrors.some((row) => row.name || row.price)) {
    errors.options = "Review the size/option names and prices.";
  }
  errors.optionRows = optionErrors;

  if (!loadedCategories.some((category) => String(category.id) === values.categoryId)) {
    errors.categoryId = categoryLoadError
      ? "Categories are unavailable. Refresh the collection and try again."
      : "Choose a valid product category.";
  }

  const imageFile = form.elements.imageFile.files[0];
  if (imageFile) {
    if (!SUPPORTED_PRODUCT_IMAGE_TYPES.has(imageFile.type)) {
      errors.imageFile = "Choose a JPG, PNG, GIF, or WebP image.";
    } else if (imageFile.size > MAX_PRODUCT_IMAGE_SIZE) {
      errors.imageFile = "Image file must be 1 MB or smaller.";
    }
  } else {
    if (values.imageUrl.length > 2048) {
      errors.imageUrl = "Image URL must be 2048 characters or fewer.";
    } else {
      try {
        getImageUrlFromForm(values.imageUrl);
      } catch (error) {
        errors.imageUrl = error.message;
      }
    }
  }

  return errors;
}

function validateProductForm(form, focusFirstInvalid = false) {
  const errors = getProductFormErrors(form);
  let firstInvalidField = null;

  for (const fieldName of PRODUCT_FORM_FIELDS) {
    const field = form.elements[fieldName];
    const errorElement = form.querySelector(`[data-validation-for="${fieldName}"]`);
    const message = errors[fieldName] || "";
    errorElement.textContent = message;

    if (message) {
      field.setAttribute("aria-invalid", "true");
      firstInvalidField ||= field;
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  form.querySelector('[data-validation-for="options"]').textContent = errors.options || "";
  getOptionRows(form).forEach((row, index) => {
    const nameInput = row.querySelector("[data-option-name]");
    const priceInput = row.querySelector("[data-option-price]");
    const rowErrors = errors.optionRows[index] || {};
    row.querySelector("[data-option-name-error]").textContent = rowErrors.name || "";
    row.querySelector("[data-option-price-error]").textContent = rowErrors.price || "";
    for (const [input, message] of [
      [nameInput, rowErrors.name],
      [priceInput, rowErrors.price]
    ]) {
      if (message) {
        input.setAttribute("aria-invalid", "true");
        firstInvalidField ||= input;
      } else {
        input.removeAttribute("aria-invalid");
      }
    }
  });

  if (errors.options && !firstInvalidField && getOptionRows(form).length === 0) {
    firstInvalidField = form.querySelector("[data-add-option]");
  }

  if (firstInvalidField) {
    if (focusFirstInvalid) {
      firstInvalidField.focus();
    }
    setStatus("Please correct the highlighted fields.", true);
    return false;
  }

  return true;
}

function clearProductFormErrors(form) {
  delete form.dataset.validationAttempted;
  for (const fieldName of PRODUCT_FORM_FIELDS) {
    form.elements[fieldName].removeAttribute("aria-invalid");
    form.querySelector(`[data-validation-for="${fieldName}"]`).textContent = "";
  }
  form.querySelector('[data-validation-for="options"]').textContent = "";
  for (const row of getOptionRows(form)) {
    row.querySelector("[data-option-name]").removeAttribute("aria-invalid");
    row.querySelector("[data-option-price]").removeAttribute("aria-invalid");
    row.querySelector("[data-option-name-error]").textContent = "";
    row.querySelector("[data-option-price-error]").textContent = "";
  }
  clearImagePreview(form);
}

function clearImagePreview(form) {
  const preview = form.querySelector("[data-image-preview]");
  const image = preview.querySelector("[data-image-preview-image]");
  const objectUrl = image.dataset.objectUrl;
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    delete image.dataset.objectUrl;
  }
  image.removeAttribute("src");
  image.alt = "";
  preview.querySelector("[data-image-preview-name]").textContent = "";
  preview.hidden = true;
}

function updateImagePreview(form) {
  clearImagePreview(form);
  const imageFile = form.elements.imageFile.files[0];
  if (!imageFile) {
    return;
  }

  const preview = form.querySelector("[data-image-preview]");
  const image = preview.querySelector("[data-image-preview-image]");
  const objectUrl = URL.createObjectURL(imageFile);
  image.src = objectUrl;
  image.alt = `Preview of ${imageFile.name}`;
  image.dataset.objectUrl = objectUrl;
  preview.querySelector("[data-image-preview-name]").textContent = imageFile.name;
  preview.hidden = false;
}

function startProductEdit(productId) {
  const product = loadedProducts.find((item) => item.id === productId);
  if (!product) {
    setStatus("Could not find that product. Refresh the collection and try again.", true);
    return;
  }

  editingProductId = product.id;
  editProductForm.elements.sku.value = product.sku;
  editProductForm.elements.name.value = product.name;
  editProductForm.elements.description.value = product.description || "";
  editProductForm.elements.categoryId.value = String(product.categoryId);
  populateOptionRows(editProductForm, getProductOptions(product));
  const imageUrl = product.imageUrl || getProductImageUrl(product) || "";
  originalEditImageUrl = isEmbeddedProductImage(imageUrl) ? imageUrl : "";
  editProductForm.elements.imageUrl.value = originalEditImageUrl ? "" : imageUrl;
  editProductForm.elements.isAvailable.checked = product.isAvailable;
  originalEditFormValues = getEditFormValues();
  editProductHeading.textContent = `Edit ${product.name}`;
  editProductDialog.showModal();
  setStatus(`Editing ${product.name}.`);
  editProductForm.elements.name.focus();
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const selectedCategory = categoryFilter.value;
  const productsWithImages = loadedProducts.filter((product) => getProductImageUrl(product));
  const visibleProducts = productsWithImages.filter((product) => {
    const searchableText = [product.name, product.sku, product.description]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      searchableText.includes(query) &&
      (selectedCategory === "all" || String(product.categoryId) === selectedCategory)
    );
  });

  productsContainer.replaceChildren(
    ...visibleProducts.map((product, index) => createProductCard(product, index))
  );

  if (loadedProducts.length === 0) {
    setStatus("No products yet. Add the first item using the form below.");
  } else if (productsWithImages.length === 0) {
    setStatus("No products with images are available.");
  } else if (visibleProducts.length === 0) {
    const categoryName = categoryFilter.selectedOptions[0].textContent;
    if (query && selectedCategory !== "all") {
      setStatus(`No products match "${searchInput.value.trim()}" in ${categoryName}.`);
    } else if (query) {
      setStatus(`No products match "${searchInput.value.trim()}".`);
    } else {
      setStatus(`No products found in ${categoryName}.`);
    }
  } else if (query || selectedCategory !== "all") {
    setStatus(`${visibleProducts.length} of ${productsWithImages.length} product(s) shown.`);
  } else {
    setStatus(`${productsWithImages.length} product(s) with images loaded.`);
  }
}

// Show a message on the page; isError controls whether it is styled as an error.
function setStatus(message, isError = false) {
  statusMessage.textContent = message; // Display the message as plain text.
  statusMessage.dataset.error = String(isError); // Save "true" or "false" for CSS styling.
}

// Send a request to the API and return its response.
async function request(url, options) {
  const response = await fetch(url, options); // Send the HTTP request and wait for the response.
  if (!response.ok) {
    const details = await response.text(); // Read any error details returned by the API.
    throw new Error(details || `Request failed (${response.status})`); // Report the details, or the HTTP status.
  }

  // A 204 response means success with no response body to parse.
  if (response.status === 204) {
    return null;
  }

  return response.json(); // Parse and return a JSON response.
}

function populateCategoryOptions() {
  const formCategoryOptions = loadedCategories.map(
    (category) => new Option(category.name, String(category.id))
  );
  const formCategorySelects = [
    productForm.elements.categoryId,
    editProductForm.elements.categoryId
  ];

  for (const select of formCategorySelects) {
    const previousValue = select.value;
    select.replaceChildren(...formCategoryOptions.map((option) => option.cloneNode(true)));
    select.disabled = loadedCategories.length === 0;
    select.value = loadedCategories.some(
      (category) => String(category.id) === previousValue
    )
      ? previousValue
      : String(loadedCategories[0]?.id ?? "");
  }

  const previousFilterValue = categoryFilter.value;
  categoryFilter.replaceChildren(
    new Option("All categories", "all"),
    ...loadedCategories.map((category) => new Option(category.name, String(category.id)))
  );
  categoryFilter.disabled = loadedCategories.length === 0;
  categoryFilter.value = loadedCategories.some(
    (category) => String(category.id) === previousFilterValue
  )
    ? previousFilterValue
    : "all";
}

async function loadCategories() {
  try {
    const categories = await request(CATEGORIES_API_URL);
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error("The API did not return any categories.");
    }

    const hasInvalidCategory = categories.some(
      (category) =>
        !category ||
        typeof category !== "object" ||
        !Number.isInteger(category.id) ||
        category.id <= 0 ||
        typeof category.name !== "string" ||
        category.name.trim().length === 0
    );
    if (hasInvalidCategory) {
      throw new Error("The API returned invalid category data.");
    }

    const categoryIds = new Set(categories.map((category) => category.id));
    if (categoryIds.size !== categories.length) {
      throw new Error("The API returned duplicate category IDs.");
    }

    loadedCategories = categories;
    categoryLoadError = "";
    populateCategoryOptions();
    for (const form of [productForm, editProductForm]) {
      form.elements.categoryId.removeAttribute("aria-invalid");
      form.querySelector('[data-validation-for="categoryId"]').textContent = "";
    }
  } catch (error) {
    loadedCategories = [];
    categoryLoadError = error.message;
    populateCategoryOptions();
    for (const form of [productForm, editProductForm]) {
      form.elements.categoryId.setAttribute("aria-invalid", "true");
      form.querySelector('[data-validation-for="categoryId"]').textContent =
        "Categories could not be loaded. Refresh the collection to try again.";
    }
  }
}

// Create and return the HTML elements that display one product.
function createProductCard(product, index) {
  const card = document.createElement("article"); // Use an article as the product card's container.
  card.className = "product-card"; // Apply the card styles from the CSS file.
  card.style.setProperty("--card-index", String(index));

  const details = document.createElement("div");
  details.className = "product-card__details";

  const cardHeader = document.createElement("div");
  cardHeader.className = "product-card__header";

  const sku = document.createElement("p");
  sku.className = "product-sku";
  sku.textContent = product.sku;

  const availability = document.createElement("span");
  availability.className = "product-status";
  availability.classList.add(product.isAvailable ? "is-available" : "is-unavailable");
  availability.textContent = product.isAvailable ? "In stock" : "Sold out";

  const category = document.createElement("span");
  category.className = "product-category";
  category.textContent =
    loadedCategories.find((item) => item.id === product.categoryId)?.name || "Active essentials";

  const image = document.createElement("img");
  image.className = "product-image";
  image.src = getProductImageUrl(product);
  image.alt = product.name;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    card.remove();
    setStatus(`${product.name} was hidden because its image could not be loaded.`, true);
  }, { once: true });

  const name = document.createElement("h3"); // Create a heading for the product name.
  name.textContent = product.name; // Show the product's name.

  const description = document.createElement("p"); // Create a paragraph for the description.
  description.className = "product-description"; // Apply the description styles.
  description.textContent = product.description || "No description provided."; // Use a fallback when no description exists.

  const options = getProductOptions(product);
  const optionSummary = document.createElement("span");
  optionSummary.className = "product-option-summary";
  optionSummary.textContent =
    product.categoryId === 1 || product.categoryId === 2
      ? `${options.length} sizes`
      : `${options.length} option${options.length === 1 ? "" : "s"}`;

  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "product-card__details-trigger";
  detailsButton.setAttribute("aria-label", `View details for ${product.name}`);
  detailsButton.addEventListener("click", () => openProductDetails(product.id));
  detailsButton.append(image, category, name, description, optionSummary);

  cardHeader.append(sku, availability);
  details.append(cardHeader, detailsButton);

  const footer = document.createElement("div");
  footer.className = "product-card__footer";

  const price = document.createElement("p"); // Create a paragraph for the price.
  price.className = "product-price";
  const lowestOptionPrice = Math.min(...getProductOptions(product).map((option) => option.price));
  price.textContent = `From ${formatCurrency(lowestOptionPrice)}`;
  price.setAttribute("aria-label", `From ${formatCurrency(lowestOptionPrice)}`);

  const deleteButton = document.createElement("button"); // Create a button for deleting this product.
  deleteButton.type = "button"; // Make sure this button does not submit the product form.
  deleteButton.textContent = "Delete"; // Set the button's visible label.
  deleteButton.addEventListener("click", () => deleteProduct(product.id)); // Delete this product when clicked.

  const actions = document.createElement("div");
  actions.className = "product-card__actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startProductEdit(product.id));

  actions.append(editButton, deleteButton);
  footer.append(price, actions);
  card.append(details, footer);
  return card; // Give the finished card back to the caller.
}

function openProductDetails(productId) {
  const product = loadedProducts.find((item) => item.id === productId);
  if (!product) {
    setStatus("Could not find that product. Refresh the collection and try again.", true);
    return;
  }

  detailProductId = product.id;
  productDetailImage.src = getProductImageUrl(product);
  productDetailImage.alt = product.name;
  productDetailName.textContent = product.name;
  productDetailSku.textContent = `SKU ${product.sku}`;
  productDetailDescription.textContent = product.description || "No additional description provided.";
  productDetailCategory.textContent =
    loadedCategories.find((category) => category.id === product.categoryId)?.name ||
    "Active essentials";
  productDetailStock.textContent = product.isAvailable
    ? "Available to add to your cart."
    : "This product is currently sold out.";
  productDetailStock.classList.toggle("is-unavailable", !product.isAvailable);

  const options = getProductOptions(product);
  productOptionSelect.replaceChildren(
    ...options.map((option) =>
      new Option(`${option.name} — ${formatCurrency(option.price)}`, option.name)
    )
  );
  productQuantityInput.value = "1";
  addToCartButton.disabled = !product.isAvailable;
  addToCartButton.textContent = product.isAvailable ? "Add to cart" : "Sold out";
  updateProductDetailPrice();
  productDetailDialog.showModal();
  productOptionSelect.focus();
}

function updateProductDetailPrice() {
  const product = loadedProducts.find((item) => item.id === detailProductId);
  const option = getProductOptions(product).find(
    (item) => item.name === productOptionSelect.value
  );
  productDetailPrice.textContent = option ? formatCurrency(option.price) : "";
}

function updateCartCount() {
  const count = cartItems.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = String(count);
  cartToggleButton.setAttribute(
    "aria-label",
    `Open shopping cart, ${count} item${count === 1 ? "" : "s"}`
  );
}

function loadSavedCart() {
  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!storedCart) {
      cartItems = [];
    } else {
      const parsedCart = JSON.parse(storedCart);
      if (
        !Array.isArray(parsedCart) ||
        parsedCart.some(
          (item) =>
            !item ||
            !Number.isInteger(item.productId) ||
            typeof item.optionName !== "string" ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )
      ) {
        throw new Error("Saved cart data is invalid.");
      }
      cartItems = parsedCart;
    }
    cartStorageError = "";
  } catch (error) {
    cartItems = [];
    cartStorageError = error.message;
    setStatus(`Could not load the saved cart: ${error.message}`, true);
  }
  updateCartCount();
}

function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    cartStorageError = "";
    updateCartCount();
    return true;
  } catch (error) {
    cartStorageError = error.message;
    setStatus(`Could not save your cart in this browser: ${error.message}`, true);
    return false;
  }
}

function makeCartAction(label, action, item, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.cartAction = action;
  button.dataset.productId = String(item.productId);
  button.dataset.optionName = item.optionName;
  return button;
}

function renderCart() {
  const validItems = [];
  const rows = [];
  let subtotal = 0;
  let removedCount = 0;

  for (const item of cartItems) {
    const product = loadedProducts.find((candidate) => candidate.id === item.productId);
    const option = product
      ? getProductOptions(product).find((candidate) => candidate.name === item.optionName)
      : null;
    if (!product || !option) {
      removedCount += 1;
      continue;
    }

    validItems.push(item);
    const lineTotal = option.price * item.quantity;
    subtotal += lineTotal;

    const row = document.createElement("article");
    row.className = "cart-item";
    const image = document.createElement("img");
    image.className = "cart-item__image";
    image.src = getProductImageUrl(product);
    image.alt = product.name;

    const details = document.createElement("div");
    details.className = "cart-item__details";
    const name = document.createElement("h3");
    name.textContent = product.name;
    const selectedOption = document.createElement("p");
    selectedOption.textContent = item.optionName;
    const unitPrice = document.createElement("p");
    unitPrice.className = "cart-item__unit-price";
    unitPrice.textContent = `${formatCurrency(option.price)} each`;
    const total = document.createElement("p");
    total.textContent = `Line total: ${formatCurrency(lineTotal)}`;
    details.append(name, selectedOption, unitPrice, total);

    const controls = document.createElement("div");
    controls.className = "cart-item__controls";
    const decrease = makeCartAction("−", "decrease", item, "cart-quantity-button");
    decrease.setAttribute("aria-label", `Decrease ${product.name} quantity`);
    decrease.disabled = item.quantity <= 1;
    const quantity = document.createElement("span");
    quantity.className = "cart-quantity";
    quantity.textContent = String(item.quantity);
    quantity.setAttribute("aria-label", "Quantity");
    const increase = makeCartAction("+", "increase", item, "cart-quantity-button");
    increase.setAttribute("aria-label", `Increase ${product.name} quantity`);
    const remove = makeCartAction("Remove", "remove", item, "cart-remove-button");
    remove.setAttribute("aria-label", `Remove ${product.name} (${item.optionName}) from cart`);
    controls.append(decrease, quantity, increase, remove);
    row.append(image, details, controls);
    rows.push(row);
  }

  cartItems = validItems;
  cartItemsContainer.replaceChildren(...rows);
  cartEmptyMessage.hidden = rows.length > 0;
  cartSubtotal.textContent = formatCurrency(subtotal);
  updateCartCount();

  if (removedCount > 0) {
    if (saveCart()) {
      setStatus("Some cart items were removed because their product or option is no longer available.");
    }
  } else if (cartStorageError) {
    setStatus(`Cart storage is unavailable: ${cartStorageError}`, true);
  }
}

function addSelectedProductToCart(event) {
  event.preventDefault();
  const product = loadedProducts.find((item) => item.id === detailProductId);
  if (!product || !product.isAvailable) {
    setStatus("This product is not available to add to your cart.", true);
    return;
  }

  const option = getProductOptions(product).find(
    (item) => item.name === productOptionSelect.value
  );
  const quantity = Number(productQuantityInput.value);
  if (!option || !Number.isInteger(quantity) || quantity < 1) {
    productDetailForm.reportValidity();
    return;
  }

  const existingItem = cartItems.find(
    (item) => item.productId === product.id && item.optionName === option.name
  );
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cartItems.push({
      productId: product.id,
      optionName: option.name,
      quantity
    });
  }

  const saved = saveCart();
  renderCart();
  productDetailDialog.close();
  if (saved) {
    setStatus(`${quantity} × ${product.name} (${option.name}) added to your cart.`);
  }
}

// Get the products from the API and display them on the page.
async function loadProducts(successMessage = "") {
  setStatus("Loading products..."); // Let the user know the request is in progress.

  try {
    loadedProducts = await request(PRODUCTS_API_URL); // Request the product list from the API.
    renderProducts(); // Apply the current search to the newly loaded products.
    renderCart();
    if (cartStorageError) {
      setStatus(`Cart storage is unavailable: ${cartStorageError}`, true);
    } else if (successMessage) {
      setStatus(successMessage);
    } else if (categoryLoadError) {
      setStatus(
        `${loadedProducts.length} product(s) loaded, but categories are unavailable: ${categoryLoadError}`,
        true
      );
    }
  } catch (error) {
    setStatus(`Could not load products: ${error.message}`, true); // Display request errors on the page.
  }
}

async function readProductFromForm(form) {
  const formData = new FormData(form);
  const categoryId = Number(formData.get("categoryId"));
  const imageFile = form.elements.imageFile.files[0];
  const options = readOptionValues(form).map((option) => ({
    name: option.name,
    price: Number(option.price)
  }));
  let imageUrl;
  if (imageFile) {
    imageUrl = await readImageFileAsDataUrl(imageFile);
  } else if (
    form === editProductForm &&
    originalEditImageUrl &&
    !formData.get("imageUrl").trim()
  ) {
    imageUrl = originalEditImageUrl;
  } else {
    imageUrl = getImageUrlFromForm(formData.get("imageUrl"));
  }

  return {
    sku: formData.get("sku").trim(),
    name: formData.get("name").trim(),
    description: formData.get("description").trim(),
    price: Math.min(...options.map((option) => option.price)),
    options,
    categoryId,
    imageUrl,
    isAvailable: formData.has("isAvailable")
  };
}

function readImageFileAsDataUrl(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected image."));
        return;
      }
      resolve(reader.result);
    }, { once: true });
    reader.addEventListener("error", () => {
      reject(reader.error || new Error("Could not read the selected image."));
    }, { once: true });
    reader.readAsDataURL(imageFile);
  });
}

// Read the Add form and send a new product to the API.
async function saveProduct(event) {
  event.preventDefault();
  productForm.dataset.validationAttempted = "true";
  if (!validateProductForm(productForm, true)) {
    return;
  }

  let product;
  try {
    product = await readProductFromForm(productForm);
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  try {
    await request(PRODUCTS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });
    productForm.reset();
    clearProductFormErrors(productForm);
    populateOptionRows(
      productForm,
      getDefaultOptionNames(productForm.elements.categoryId.value).map((name) => ({
        name,
        price: ""
      }))
    );
    await loadProducts("Product added.");
  } catch (error) {
    setStatus(`Could not add product: ${error.message}`, true);
  }
}

// Read the separate Edit form and send the update to the API.
async function saveProductEdit(event) {
  event.preventDefault();
  if (editingProductId === null) {
    setStatus("Select a product to edit before saving.", true);
    return;
  }

  editProductForm.dataset.validationAttempted = "true";
  if (!validateProductForm(editProductForm, true)) {
    return;
  }

  let product;
  try {
    product = await readProductFromForm(editProductForm);
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  const productId = editingProductId;
  try {
    await request(`${PRODUCTS_API_URL}/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId, ...product })
    });
    editProductDialog.close();
    await loadProducts("Product updated.");
  } catch (error) {
    setStatus(`Could not update product: ${error.message}`, true);
  }
}

function cancelProductEdit(event) {
  event?.preventDefault();
  if (editingProductId === null) {
    editProductDialog.close();
    return;
  }

  if (JSON.stringify(getEditFormValues()) === JSON.stringify(originalEditFormValues)) {
    editProductDialog.close();
    return;
  }

  if (window.confirm("Discard your changes and stop editing this product?")) {
    editProductDialog.close();
    setStatus("Edit cancelled.");
  }
}

function resetEditForm() {
  editProductForm.reset();
  clearProductFormErrors(editProductForm);
  populateOptionRows(editProductForm, []);
  editingProductId = null;
  originalEditFormValues = null;
  originalEditImageUrl = "";
  editProductHeading.textContent = "Edit product";
}

// Delete one product by its ID, then refresh the product list.
async function deleteProduct(id) {
  try {
    await request(`${PRODUCTS_API_URL}/${id}`, { method: "DELETE" }); // Send DELETE to the URL for this product.
    if (editingProductId === id) {
      editProductDialog.close();
    }
    await loadProducts("Product deleted."); // Refresh the list so the deleted product disappears.
  } catch (error) {
    setStatus(`Could not delete product: ${error.message}`, true); // Display any error from deleting the product.
  }
}

// Call saveProduct whenever the Add form is submitted.
productForm.addEventListener("submit", saveProduct);
editProductForm.addEventListener("submit", saveProductEdit);
for (const form of [productForm, editProductForm]) {
  form.querySelector("[data-add-option]").addEventListener("click", () => {
    const row = createOptionRow(form);
    form.querySelector("[data-option-list]").append(row);
    form.dataset.optionsCustomized = "true";
    row.querySelector("[data-option-name]").focus();
  });
  form.elements.imageFile.addEventListener("change", () => updateImagePreview(form));
  const updateValidation = () => {
    if (form.dataset.validationAttempted === "true") {
      if (
        validateProductForm(form) &&
        statusMessage.textContent === "Please correct the highlighted fields."
      ) {
        setStatus("");
      }
    }
  };
  form.addEventListener("input", updateValidation);
  form.addEventListener("change", updateValidation);
}
productForm.elements.categoryId.addEventListener("change", () => {
  if (productForm.dataset.optionsCustomized === "true") {
    return;
  }
  populateOptionRows(
    productForm,
    getDefaultOptionNames(productForm.elements.categoryId.value).map((name) => ({
      name,
      price: ""
    }))
  );
});
// Reload categories and products whenever the refresh button is clicked.
refreshButton.addEventListener("click", async () => {
  await loadCategories();
  await loadProducts();
});
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
cancelEditButton.addEventListener("click", cancelProductEdit);
editProductDialog.addEventListener("cancel", cancelProductEdit);
editProductDialog.addEventListener("close", resetEditForm);
productDetailForm.addEventListener("submit", addSelectedProductToCart);
productOptionSelect.addEventListener("change", updateProductDetailPrice);
closeProductDetailButton.addEventListener("click", () => productDetailDialog.close());
cartToggleButton.addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});
closeCartButton.addEventListener("click", () => cartDialog.close());
cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) {
    return;
  }

  const productId = Number(button.dataset.productId);
  const optionName = button.dataset.optionName;
  const itemIndex = cartItems.findIndex(
    (item) => item.productId === productId && item.optionName === optionName
  );
  if (itemIndex < 0) {
    return;
  }

  if (button.dataset.cartAction === "remove") {
    cartItems.splice(itemIndex, 1);
  } else if (button.dataset.cartAction === "increase") {
    cartItems[itemIndex].quantity += 1;
  } else if (
    button.dataset.cartAction === "decrease" &&
    cartItems[itemIndex].quantity > 1
  ) {
    cartItems[itemIndex].quantity -= 1;
  } else {
    return;
  }

  saveCart();
  renderCart();
});
// Load categories before products so form and filter options are available.
async function initializePage() {
  loadSavedCart();
  await loadCategories();
  populateOptionRows(
    productForm,
    getDefaultOptionNames(productForm.elements.categoryId.value).map((name) => ({
      name,
      price: ""
    }))
  );
  await loadProducts();
}

initializePage();
