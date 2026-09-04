// =====================================================
// INDEX-1.JS – DROPDOWN FUNCTIONALITY (FIXED)
// =====================================================

(function() {
    'use strict';

    var dropdownBtn = document.getElementById('categoryDropdownBtn');
    var dropdownMenu = document.getElementById('categoryDropdownMenu');

    if (!dropdownBtn || !dropdownMenu) {
        console.warn('Dropdown elements not found');
        return;
    }

    // Remove any existing listeners by cloning (to be safe)
    var newBtn = dropdownBtn.cloneNode(true);
    dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
    dropdownBtn = newBtn;

    function toggleDropdown(e) {
        e.stopPropagation();
        var isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
        dropdownBtn.setAttribute('aria-expanded', !isExpanded);
        dropdownMenu.classList.toggle('show');
    }

    function closeDropdown() {
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownMenu.classList.remove('show');
    }

    dropdownBtn.addEventListener('click', toggleDropdown);

    document.addEventListener('click', function(e) {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close when a category is clicked
    var categoryItems = document.querySelectorAll('.dropdown-category-item');
    categoryItems.forEach(function(item) {
        item.addEventListener('click', closeDropdown);
    });

    console.log('Dropdown fixed successfully!');
})();
