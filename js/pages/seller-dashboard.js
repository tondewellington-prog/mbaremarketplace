[...]
498| async function handleProfileImage(event) {
499|     const file = event.target.files[0];
500|     if (!file) return;
501|     if (!file.type.match('image.*')) { alert('Please select an image file'); return; }
[...]
540| async function handleCoverImage(event) {
541|     const file = event.target.files[0];
542|     if (!file) return;
543|     if (!file.type.match('image.*')) { alert('Please select an image file'); return; }
[...]
1235|         if (ul) ul.onclick = e => { e.preventDefault(); showUpgradeOptions(); };
[...]
1248| function esc(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]); }
[...]
1271| window.whatsappInquiry = function(t) { window.open('messages.html?text=' + encodeURIComponent('Hello, interested in "' + t + '" on Mbare Marketplace.'), '_blank'); };
[...]
1328| window.handleFileSelect = function(e) { if (e.target.files[0]) handleImageFile(e.target.files[0]); };
[...]
1350|     i.onchange = function(e) { if (e.target.files[0]) handleImageFile(e.target.files[0]); };
[...]
1467|     document.getElementById('closeUpgradeModal').onclick = () => document.getElementById('upgradeModal')?.remove();
[...]
