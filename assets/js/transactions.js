(function () {
  "use strict";

  const productStorageKey = "visionstock-products";
  const transactionStorageKey = "visionstock-transactions";
  const initialProducts = [
    { id: "beras", name: "Beras", stock: 10, category: "bahan baku" },
    { id: "buku", name: "Buku", stock: 25, category: "ATK" },
    { id: "pena", name: "Pena", stock: 30, category: "ATK" },
    { id: "susu", name: "Susu", stock: 30, category: "bahan baku" },
    { id: "telur", name: "Telur", stock: 45, category: "bahan baku" },
    { id: "tepung", name: "Tepung", stock: 20, category: "bahan baku" }
  ];

  function readProducts() {
    const savedProducts = window.sessionStorage.getItem(productStorageKey);
    if (!savedProducts) {
      return initialProducts.map(function (product) {
        return Object.assign({}, product);
      });
    }

    const products = JSON.parse(savedProducts);
    if (!Array.isArray(products) || products.some(function (product) {
      return !product || typeof product.id !== "string" ||
        typeof product.name !== "string" || !Number.isInteger(product.stock) ||
        product.stock < 0;
    })) {
      throw new Error("Data stok sementara tidak valid.");
    }
    return products;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const parts = value.split("-");
    return Number(parts[2]) + "/" + Number(parts[1]) + "/" + parts[0];
  }

  function showMessage(element, message) {
    if (element) {
      element.textContent = message;
    }
  }

  function startManualTransactionForm() {
    const form = document.getElementById("manual-transaction-form");
    if (!form) {
      return false;
    }

    const status = document.getElementById("manual-transaction-status");
    const productSelect = document.getElementById("nama-produk");
    const quantityInput = document.getElementById("stok-terjual");
    const dateInput = document.getElementById("tanggal-terjual");
    const invoiceInput = document.getElementById("invoice");
    let products;
    try {
      products = readProducts();
    } catch (error) {
      showMessage(status, error.message + " Tidak dapat menambahkan transaksi.");
      form.hidden = true;
      return false;
    }

    products.forEach(function (product) {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = product.name + " (stok: " + product.stock + ")";
      productSelect.append(option);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showMessage(status, "");
      if (!form.reportValidity()) {
        return;
      }

      const selectedProduct = products.find(function (product) {
        return product.id === productSelect.value;
      });
      const quantity = Number(quantityInput.value);
      const invoice = invoiceInput.files[0];
      if (!selectedProduct) {
        showMessage(status, "Pilih produk yang tersedia.");
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        showMessage(status, "Stok terjual harus berupa bilangan bulat positif.");
        return;
      }
      if (quantity > selectedProduct.stock) {
        showMessage(status, "Stok tidak mencukupi. Sisa stok " + selectedProduct.name + " adalah " + selectedProduct.stock + ".");
        return;
      }
      if (invoice && (!["application/pdf", "image/jpeg", "image/png"].includes(invoice.type) ||
          invoice.size > 5 * 1024 * 1024)) {
        showMessage(status, "Invoice harus berupa PDF, JPG, atau PNG dengan ukuran maksimal 5 MB.");
        return;
      }

      let transactions;
      try {
        const savedTransactions = window.sessionStorage.getItem(transactionStorageKey);
        transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
        if (!Array.isArray(transactions)) {
          throw new Error("Data transaksi sementara tidak valid.");
        }
      } catch (error) {
        showMessage(status, "Data transaksi tidak dapat dibaca: " + error.message);
        return;
      }

      const transaction = {
        id: "transaksi-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: quantity,
        date: formatDate(dateInput.value),
        invoiceName: invoice ? invoice.name : ""
      };
      const previousProducts = window.sessionStorage.getItem(productStorageKey);
      selectedProduct.stock -= quantity;

      try {
        window.sessionStorage.setItem(productStorageKey, JSON.stringify(products));
        transactions.push(transaction);
        window.sessionStorage.setItem(transactionStorageKey, JSON.stringify(transactions));
      } catch (error) {
        if (previousProducts === null) {
          window.sessionStorage.removeItem(productStorageKey);
        } else {
          window.sessionStorage.setItem(productStorageKey, previousProducts);
        }
        showMessage(status, "Transaksi tidak dapat disimpan untuk sesi ini: " + error.message);
        return;
      }

      window.location.href = "riwayat-transaksi.html";
    });

    form.addEventListener("reset", function () {
      showMessage(status, "");
    });
    return true;
  }

  function startTransactionList() {
    const tableBody = document.getElementById("transaction-list");
    if (!tableBody) {
      return false;
    }

    const searchForm = document.getElementById("transaction-search");
    const searchInput = document.getElementById("cari-transaksi");
    const filterForm = document.getElementById("transaction-filters");
    const nameOrder = document.getElementById("urut-transaksi");
    const quantityOrder = document.getElementById("urut-jumlah");
    const dateFilter = document.getElementById("tanggal-transaksi");
    const emptyMessage = document.getElementById("empty-transactions");
    const status = document.getElementById("transaction-status");
    const staticRows = Array.from(tableBody.rows);
    let savedTransactions;

    document.getElementById("import-transactions-button").addEventListener("click", function () {
      window.location.href = "impor-transaksi.html#excel";
    });
    document.getElementById("edit-transactions-button").addEventListener("click", function () {
      window.location.href = "impor-transaksi.html#manual";
    });

    try {
      const saved = window.sessionStorage.getItem(transactionStorageKey);
      savedTransactions = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(savedTransactions)) {
        throw new Error("Data transaksi sementara tidak valid.");
      }
    } catch (error) {
      showMessage(status, "Data transaksi sesi tidak dapat dibaca: " + error.message);
      savedTransactions = [];
    }

    const sessionRows = savedTransactions.map(function (transaction, index) {
      const row = document.createElement("tr");
      const numberCell = document.createElement("td");
      const nameCell = document.createElement("th");
      const quantityCell = document.createElement("td");
      const dateCell = document.createElement("td");
      const invoiceCell = document.createElement("td");
      const invoiceImage = document.createElement("img");
      numberCell.textContent = String(staticRows.length + index + 1);
      nameCell.scope = "row";
      nameCell.textContent = transaction.productName;
      quantityCell.textContent = String(transaction.quantity);
      dateCell.textContent = transaction.date;
      invoiceImage.src = "assets/SVG%20File/photo.svg";
      invoiceImage.alt = transaction.invoiceName
        ? "Invoice " + transaction.productName + ": " + transaction.invoiceName
        : "Tidak ada invoice";
      invoiceCell.append(invoiceImage);
      row.append(numberCell, nameCell, quantityCell, dateCell, invoiceCell);
      return row;
    });
    const allRows = staticRows.concat(sessionRows);

    function renderTransactions() {
      const query = searchInput.value.trim().toLocaleLowerCase("id");
      const selectedDate = formatDate(dateFilter.value);
      let visibleRows = allRows.filter(function (row) {
        const productName = row.cells[1].textContent.trim().toLocaleLowerCase("id");
        const rowDate = row.cells[3].textContent.trim();
        return productName.includes(query) && (!selectedDate || rowDate === selectedDate);
      });

      if (nameOrder.value === "az") {
        visibleRows.sort(function (first, second) {
          return first.cells[1].textContent.trim().localeCompare(second.cells[1].textContent.trim(), "id");
        });
      } else if (nameOrder.value === "za") {
        visibleRows.sort(function (first, second) {
          return second.cells[1].textContent.trim().localeCompare(first.cells[1].textContent.trim(), "id");
        });
      } else if (quantityOrder.value === "terbanyak") {
        visibleRows.sort(function (first, second) {
          return Number(second.cells[2].textContent) - Number(first.cells[2].textContent);
        });
      } else if (quantityOrder.value === "tersedikit") {
        visibleRows.sort(function (first, second) {
          return Number(first.cells[2].textContent) - Number(second.cells[2].textContent);
        });
      }

      tableBody.replaceChildren.apply(tableBody, visibleRows);
      emptyMessage.hidden = visibleRows.length > 0;
      status.textContent = visibleRows.length + " transaksi ditampilkan.";
    }

    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      renderTransactions();
    });
    searchInput.addEventListener("input", renderTransactions);
    filterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      renderTransactions();
    });
    renderTransactions();
    return true;
  }

  try {
    if (!startTransactionList()) {
      startManualTransactionForm();
    }
  } catch (error) {
    showMessage(document.getElementById("manual-transaction-status"), "Form transaksi tidak dapat dibuka: " + error.message);
  }
}());
