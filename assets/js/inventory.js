(function () {
  "use strict";

  const storageKey = "visionstock-products";
  const initialProducts = [
    { id: "beras", name: "Beras", stock: 10, category: "bahan baku", image: "assets/images/beras.png" },
    { id: "buku", name: "Buku", stock: 25, category: "ATK", image: "assets/images/buku.png" },
    { id: "pena", name: "Pena", stock: 30, category: "ATK", image: "assets/images/pena.png" },
    { id: "susu", name: "Susu", stock: 30, category: "bahan baku", image: "assets/images/susu.png" },
    { id: "telur", name: "Telur", stock: 45, category: "bahan baku", image: "assets/images/telur.png" },
    { id: "tepung", name: "Tepung", stock: 20, category: "bahan baku", image: "assets/images/tepung.png" }
  ];

  function readProducts() {
    const savedProducts = window.sessionStorage.getItem(storageKey);
    if (!savedProducts) {
      return initialProducts.map(function (product) {
        return Object.assign({}, product);
      });
    }

    const products = JSON.parse(savedProducts);
    if (!Array.isArray(products) || products.some(function (product) {
      return !product || typeof product.id !== "string" ||
        typeof product.name !== "string" || typeof product.category !== "string" ||
        !Number.isInteger(product.stock) || product.stock < 0;
    })) {
      throw new Error("Data stok sementara tidak valid. Muat ulang halaman untuk memulai kembali.");
    }
    return products;
  }

  function writeProducts(products) {
    window.sessionStorage.setItem(storageKey, JSON.stringify(products));
  }

  function readProductImage(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Gambar tidak dapat dibaca. Pilih file lain dan coba lagi."));
      };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () {
          reject(new Error("File gambar tidak valid. Pilih JPG atau PNG."));
        };
        image.onload = function () {
          const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Browser tidak dapat memproses gambar ini."));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function createProductId(name, products) {
    const baseId = name.toLocaleLowerCase("id")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "produk";
    let id = baseId;
    let suffix = 2;
    while (products.some(function (product) { return product.id === id; })) {
      id = baseId + "-" + suffix;
      suffix += 1;
    }
    return id;
  }

  function showMessage(element, message) {
    if (element) {
      element.textContent = message;
    }
  }

  function startManualProductForm() {
    const form = document.getElementById("manual-product-form");
    if (!form) {
      return false;
    }

    const status = document.getElementById("manual-product-status");
    const nameInput = document.getElementById("nama-produk");
    const descriptionInput = document.getElementById("deskripsi-produk");
    const imageInput = document.getElementById("gambar-produk");
    const stockInput = document.getElementById("stok-produk");
    const categoryInput = document.getElementById("jenis-produk");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      showMessage(status, "");
      if (!form.reportValidity()) {
        return;
      }

      const name = nameInput.value.trim();
      const category = categoryInput.value.trim();
      const stock = Number(stockInput.value);
      const imageFile = imageInput.files[0];
      if (!name || !category || !Number.isInteger(stock) || stock < 0) {
        showMessage(status, "Nama dan jenis produk wajib diisi. Stok harus berupa bilangan bulat nol atau lebih.");
        return;
      }
      if (imageFile && (!["image/jpeg", "image/png"].includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024)) {
        showMessage(status, "Gambar harus berformat JPG atau PNG dan berukuran maksimal 5 MB.");
        return;
      }

      try {
        const products = readProducts();
        if (products.some(function (product) {
          return product.name.toLocaleLowerCase("id") === name.toLocaleLowerCase("id");
        })) {
          showMessage(status, "Nama produk sudah tersedia. Gunakan nama produk yang berbeda.");
          return;
        }

        const image = imageFile
          ? await readProductImage(imageFile)
          : "assets/images/image-landing.png";
        products.push({
          id: createProductId(name, products),
          name: name,
          description: descriptionInput.value.trim(),
          stock: stock,
          category: category,
          image: image
        });
        writeProducts(products);
        window.location.href = "data-stok.html";
      } catch (error) {
        showMessage(status, "Data belum tersimpan untuk sesi ini: " + error.message);
      }
    });

    form.addEventListener("reset", function () {
      showMessage(status, "");
    });
    return true;
  }

  function startStockList() {
    const list = document.getElementById("product-list");
    if (!list) {
      return false;
    }

    const message = document.getElementById("inventory-status");
    const emptyMessage = document.getElementById("empty-products");
    const searchForm = document.getElementById("product-search");
    const searchInput = document.getElementById("cari-produk");
    const filterForm = document.getElementById("product-filters");
    const nameOrder = document.getElementById("urut-nama");
    const stockOrder = document.getElementById("urut-stok");
    const categoryFilter = document.getElementById("jenis-produk");
    const params = new URLSearchParams(window.location.search);
    let products;

    try {
      products = readProducts();
    } catch (error) {
      showMessage(message, error.message);
      return false;
    }

    const categories = Array.from(new Set(products.map(function (product) {
      return product.category;
    }))).sort(function (first, second) {
      return first.localeCompare(second, "id");
    });
    categories.forEach(function (categoryName) {
      const option = document.createElement("option");
      option.value = categoryName.toLocaleLowerCase("id").replace(/\s+/g, "-");
      option.textContent = categoryName;
      categoryFilter.append(option);
    });

    if (params.has("updated")) {
      const updatedProduct = products.find(function (product) {
        return product.id === params.get("updated");
      });
      if (updatedProduct) {
        showMessage(message, "Data stok " + updatedProduct.name + " berhasil disimpan untuk sesi ini.");
      }
    }

    function renderProducts() {
      const query = searchInput.value.trim().toLocaleLowerCase("id");
      const selectedCategory = categoryFilter.value;
      let visibleProducts = products.filter(function (product) {
        const matchesQuery = product.name.toLocaleLowerCase("id").includes(query);
        const matchesCategory = !selectedCategory ||
          product.category.toLocaleLowerCase("id").replace(/\s+/g, "-") === selectedCategory;
        return matchesQuery && matchesCategory;
      });

      if (nameOrder.value === "az") {
        visibleProducts.sort(function (first, second) {
          return first.name.localeCompare(second.name, "id");
        });
      } else if (nameOrder.value === "za") {
        visibleProducts.sort(function (first, second) {
          return second.name.localeCompare(first.name, "id");
        });
      } else if (stockOrder.value === "terbanyak") {
        visibleProducts.sort(function (first, second) {
          return second.stock - first.stock;
        });
      } else if (stockOrder.value === "tersedikit") {
        visibleProducts.sort(function (first, second) {
          return first.stock - second.stock;
        });
      }

      list.replaceChildren();
      visibleProducts.forEach(function (product) {
        const item = document.createElement("li");
        const article = document.createElement("article");
        const image = document.createElement("img");
        const heading = document.createElement("h3");
        const stock = document.createElement("p");
        const category = document.createElement("p");
        const editButton = document.createElement("button");

        image.src = product.image;
        image.alt = product.name;
        heading.textContent = product.name;
        stock.textContent = "Stok: " + product.stock;
        category.textContent = "Jenis Produk: " + product.category;
        editButton.type = "button";
        editButton.textContent = "Edit Stok";
        editButton.addEventListener("click", function () {
          window.location.href = "edit-stok.html?produk=" + encodeURIComponent(product.id);
        });

        article.append(image, heading, stock, category, editButton);
        item.append(article);
        list.append(item);
      });
      emptyMessage.hidden = visibleProducts.length > 0;
    }

    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      renderProducts();
    });
    searchInput.addEventListener("input", renderProducts);
    filterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      renderProducts();
    });
    renderProducts();
    return true;
  }

  function startProductEditor() {
    const form = document.getElementById("edit-product-form");
    if (!form) {
      return false;
    }

    const message = document.getElementById("edit-status");
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("produk");
    let products;

    try {
      products = readProducts();
    } catch (error) {
      showMessage(message, error.message);
      form.hidden = true;
      return false;
    }

    const product = products.find(function (item) {
      return item.id === productId;
    });
    if (!product) {
      showMessage(message, "Produk tidak ditemukan. Kembali ke Data Stok untuk memilih produk.");
      form.hidden = true;
      return false;
    }

    const nameInput = document.getElementById("edit-product-name");
    const stockInput = document.getElementById("edit-product-stock");
    const categoryInput = document.getElementById("edit-product-category");
    const image = document.getElementById("edit-product-image");
    const caption = document.getElementById("edit-product-caption");
    nameInput.value = product.name;
    stockInput.value = product.stock;
    categoryInput.value = product.category;
    image.src = product.image;
    image.alt = product.name;
    caption.textContent = "Produk: " + product.name;

    document.getElementById("cancel-edit").addEventListener("click", function () {
      window.location.href = "data-stok.html";
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) {
        return;
      }

      product.name = nameInput.value.trim();
      product.stock = Number(stockInput.value);
      product.category = categoryInput.value.trim();
      if (!product.name || !product.category || !Number.isInteger(product.stock) || product.stock < 0) {
        showMessage(message, "Nama, jenis produk, dan stok bilangan bulat nol atau lebih harus diisi.");
        return;
      }

      try {
        writeProducts(products);
      } catch (error) {
        showMessage(message, "Perubahan tidak dapat disimpan dalam sesi browser ini: " + error.message);
        return;
      }
      window.location.href = "data-stok.html?updated=" + encodeURIComponent(product.id);
    });
    return true;
  }

  try {
    if (!startStockList()) {
      if (!startProductEditor()) {
        startManualProductForm();
      }
    }
  } catch (error) {
    showMessage(document.getElementById("inventory-status"), "Data stok tidak dapat dibuka: " + error.message);
    showMessage(document.getElementById("edit-status"), "Data stok tidak dapat dibuka: " + error.message);
    showMessage(document.getElementById("manual-product-status"), "Form tidak dapat dibuka: " + error.message);
  }
}());
