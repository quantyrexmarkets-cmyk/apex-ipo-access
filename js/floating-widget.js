// ============================================
// APEX — SmartSupp Live Chat Loader
// Uses SmartSupp's native widget (default bubble + chat window)
// ============================================

(function(){
  if (window.__apexSmartSuppLoaded) return;
  window.__apexSmartSuppLoaded = true;

  var _smartsupp = window._smartsupp = window._smartsupp || {};
  _smartsupp.key = '7d6445f6308e329b33468a584f675c298bd2c871';

  window.smartsupp||(function(d) {
    var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
    s=d.getElementsByTagName('script')[0];c=d.createElement('script');
    c.type='text/javascript';c.charset='utf-8';c.async=true;
    c.src='https://www.smartsuppchat.com/loader.js?';
    s.parentNode.insertBefore(c,s);
  })(document);

  console.log('✓ SmartSupp loader injected');
})();
