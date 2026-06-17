window.CATEGORY_PAGE_CONFIGS = {
  "books": {
    "gridId": "booksGrid",
    "images": [
      "books/1.jpg",
      "books/2.jpg",
      "books/3.jpg",
      "books/4.jpg",
      "books/5.jpg",
      "books/6.jpg",
      "books/7.jpg",
      "books/8.jpg",
      "books/9.jpg",
      "books/10.jpg"
    ],
    "fetchQuery": "select=*&order=created_at.desc",
    "filter": {
      "categoryKeywords": [
        "book",
        "literature",
        "textbook",
        "novel",
        "magazine"
      ],
      "titleKeywords": [
        "book"
      ],
      "descriptionKeywords": [
        "book"
      ]
    },
    "sellerFallback": "Book Store",
    "emptyMessage": "No books found.",
    "placeholderText": "Book",
    "loadLabel": "Books"
  },
  "clothing": {
    "gridId": "clothingGrid",
    "images": [
      "clothing/1.jpg",
      "clothing/2.jpg",
      "clothing/3.jpg",
      "clothing/4.jpg",
      "clothing/5.jpg",
      "clothing/6.jpg",
      "clothing/7.jpg",
      "clothing/8.jpg",
      "clothing/9.jpg",
      "clothing/10.jpg"
    ],
    "fetchQuery": "select=*&order=created_at.desc",
    "filter": {
      "categoryKeywords": [
        "cloth",
        "fashion",
        "apparel",
        "wear",
        "shirt",
        "dress",
        "shoe"
      ],
      "titleKeywords": [
        "cloth"
      ],
      "descriptionKeywords": [
        "cloth"
      ]
    },
    "sellerFallback": "Clothing Store",
    "emptyMessage": "No clothing products found.",
    "placeholderText": "Clothing",
    "loadLabel": "Clothing"
  },
  "electronics": {
    "gridId": "electronicsGrid",
    "images": [
      "electronics/1.jpg",
      "electronics/2.jpg",
      "electronics/3.jpg",
      "electronics/4.jpg",
      "electronics/5.jpg",
      "electronics/6.jpg",
      "electronics/7.jpg",
      "electronics/8.jpg",
      "electronics/9.jpg",
      "electronics/10.jpg"
    ],
    "fetchQuery": "select=*&order=created_at.desc",
    "filter": {
      "categoryKeywords": [
        "electronic",
        "electronics",
        "gadget",
        "tech",
        "computer",
        "phone",
        "laptop"
      ],
      "titleKeywords": [
        "electronic",
        "gadget"
      ],
      "descriptionKeywords": [
        "electronic",
        "gadget"
      ]
    },
    "sellerFallback": "Electronics Store",
    "emptyMessage": "No electronics products found.",
    "placeholderText": "Electronics",
    "loadLabel": "Electronics"
  },
  "hardware": {
    "gridId": "hardwareGrid",
    "images": [
      "hardware/1.jpg",
      "hardware/2.jpg",
      "hardware/3.jpg",
      "hardware/4.jpg",
      "hardware/5.jpg",
      "hardware/6.jpg",
      "hardware/7.jpg",
      "hardware/8.jpg",
      "hardware/9.jpg",
      "hardware/10.jpg"
    ],
    "fetchQuery": "select=*&order=created_at.desc",
    "filter": {
      "categoryKeywords": [
        "hardware",
        "tool",
        "building",
        "construction",
        "iron",
        "steel",
        "paint",
        "cement",
        "brick"
      ],
      "titleKeywords": [
        "hardware",
        "tool"
      ],
      "descriptionKeywords": [
        "hardware"
      ]
    },
    "sellerFallback": "Hardware Store",
    "emptyMessage": "No hardware products found.",
    "placeholderText": "Hardware",
    "loadLabel": "Hardware"
  },
  "farm-products": {
    "gridId": "farmProductsGrid",
    "images": [
      "farm_products/1.jpg",
      "farm_products/2.jpg",
      "farm_products/3.jpg",
      "farm_products/4.jpg",
      "farm_products/5.jpg",
      "farm_products/6.jpg",
      "farm_products/7.jpg",
      "farm_products/8.jpg",
      "farm_products/9.jpg",
      "farm_products/10.jpg"
    ],
    "fetchQuery": "select=*&order=created_at.desc",
    "filter": {
      "categoryKeywords": [
        "farm",
        "agric",
        "crop",
        "vegetable",
        "fruit",
        "seed",
        "fertilizer",
        "livestock"
      ],
      "titleKeywords": [
        "farm",
        "agric"
      ],
      "descriptionKeywords": [
        "farm"
      ]
    },
    "sellerFallback": "Farm Store",
    "emptyMessage": "No farm products found.",
    "placeholderText": "Farm+Product",
    "loadLabel": "Farm products"
  },
  "beauty-cosmetics": {
    "gridId": "beautyGrid",
    "images": [
      "beauty/1.jpg",
      "beauty/2.jpg",
      "beauty/3.jpg",
      "beauty/4.jpg",
      "beauty/5.jpg",
      "beauty/6.jpg",
      "beauty/7.jpg",
      "beauty/8.jpg",
      "beauty/9.jpg",
      "beauty/10.jpg",
      "beauty/11.jpg",
      "beauty/12.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Beauty %26 Cosmetics&order=created_at.desc",
    "sellerFallback": "Beauty Store",
    "emptyMessage": "No beauty products found.",
    "placeholderText": "Beauty",
    "loadLabel": "Beauty & Cosmetics"
  },
  "home-and-kitchen": {
    "gridId": "homeAndKitchenGrid",
    "images": [
      "home&kitchen/1.jpg",
      "home&kitchen/2.jpg",
      "home&kitchen/3.jpg",
      "home&kitchen/4.jpg",
      "home&kitchen/5.jpg",
      "home&kitchen/6.jpg",
      "home&kitchen/7.jpg",
      "home&kitchen/8.jpg",
      "home&kitchen/9.jpg",
      "home&kitchen/10.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Home %26 Kitchen&order=created_at.desc",
    "sellerFallback": "Home & Kitchen Store",
    "emptyMessage": "No Home & Kitchen products found.",
    "placeholderText": "Product",
    "loadLabel": "Home & Kitchen"
  },
  "pet-supplies": {
    "gridId": "petSuppliesGrid",
    "images": [
      "pet_supplies/1.jpg",
      "pet_supplies/2.jpg",
      "pet_supplies/3.jpg",
      "pet_supplies/4.jpg",
      "pet_supplies/5.jpg",
      "pet_supplies/6.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Pet Supplies&order=created_at.desc",
    "sellerFallback": "Pet Store",
    "emptyMessage": "No pet supplies found.",
    "placeholderText": "Pet+Supplies",
    "loadLabel": "Pet supplies"
  },
  "pets-livestock": {
    "gridId": "petsLivestockGrid",
    "images": [
      "pets_livestock/1.jpg",
      "pets_livestock/2.jpg",
      "pets_livestock/3.jpg",
      "pets_livestock/4.jpg",
      "pets_livestock/5.jpg",
      "pets_livestock/6.jpg",
      "pets_livestock/7.jpg",
      "pets_livestock/8.jpg",
      "pets_livestock/9.jpg",
      "pets_livestock/10.jpg",
      "pets_livestock/11.jpg",
      "pets_livestock/12.jpg",
      "pets_livestock/13.jpg",
      "pets_livestock/14.jpg",
      "pets_livestock/15.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Pets %26 Livestock&order=created_at.desc",
    "sellerFallback": "Livestock Trader",
    "emptyMessage": "No pets or livestock found.",
    "placeholderText": "Pets+Livestock",
    "loadLabel": "Pets & Livestock"
  },
  "vehicles-transportation": {
    "gridId": "vehiclesGrid",
    "images": [
      "vehicles/1.jpg",
      "vehicles/2.jpg",
      "vehicles/3.jpg",
      "vehicles/4.jpg",
      "vehicles/5.jpg",
      "vehicles/6.jpg",
      "vehicles/7.jpg",
      "vehicles/8.jpg",
      "vehicles/9.jpg",
      "vehicles/10.jpg",
      "vehicles/11.jpg",
      "vehicles/12.jpg",
      "vehicles/13.jpg",
      "vehicles/14.jpg",
      "vehicles/15.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Vehicles %26 Transportation&order=created_at.desc",
    "sellerFallback": "Vehicle Dealer",
    "emptyMessage": "No vehicles found.",
    "placeholderText": "Vehicle",
    "loadLabel": "Vehicles"
  },
  "vehicle-parts": {
    "gridId": "vehiclePartsGrid",
    "images": [
      "vehicle_parts/1.jpg",
      "vehicle_parts/2.jpg",
      "vehicle_parts/3.jpg",
      "vehicle_parts/4.jpg",
      "vehicle_parts/5.jpg",
      "vehicle_parts/6.jpg",
      "vehicle_parts/7.jpg",
      "vehicle_parts/8.jpg",
      "vehicle_parts/9.jpg",
      "vehicle_parts/10.jpg"
    ],
    "fetchQuery": "select=*&category=eq.Vehicle Parts %26 Accessories&order=created_at.desc",
    "sellerFallback": "Auto Parts Store",
    "emptyMessage": "No vehicle parts found.",
    "placeholderText": "Vehicle+Part",
    "loadLabel": "Vehicle parts"
  }
};
