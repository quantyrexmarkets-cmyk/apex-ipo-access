// Auto-highlight active bottom nav tab based on current page
(function() {
  function setActiveTab() {
    var path = window.location.pathname.split('/').pop() || 'dashboard.html';
    var tabs = document.querySelectorAll('.tab-nav .tab');
    tabs.forEach(function(tab) {
      tab.classList.remove('active');
      var onclick = tab.getAttribute('onclick') || '';
      if (onclick.indexOf(path) !== -1) {
        tab.classList.add('active');
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setActiveTab);
  } else {
    setActiveTab();
  }
})();
