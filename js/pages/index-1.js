// Simple dropdown functionality only - NO product interference
        const dropdownBtn = document.getElementById('categoryDropdownBtn');
        const dropdownMenu = document.getElementById('categoryDropdownMenu');
        
        function toggleDropdown(event) {
            event.stopPropagation();
            const isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
            dropdownBtn.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show');
        }
        
        function closeDropdown() {
            dropdownBtn.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('show');
        }
        
        if (dropdownBtn) {
            dropdownBtn.addEventListener('click', toggleDropdown);
        }
        
        document.addEventListener('click', function(event) {
            if (!dropdownBtn?.contains(event.target) && !dropdownMenu?.contains(event.target)) {
                closeDropdown();
            }
        });
        
        const categoryItems = document.querySelectorAll('.dropdown-category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                closeDropdown();
            });
        });
