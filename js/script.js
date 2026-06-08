window.addEventListener('load', function() {
  var hamburger = document.getElementById('hamburger');
  var sideMenu = document.getElementById('sideMenu');
  var backdrop = document.getElementById('menuBackdrop');
  var closeBtn = document.getElementById('menuClose');

  function openMenu(){
    hamburger.classList.add('active');
    sideMenu.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    hamburger.classList.remove('active');
    sideMenu.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if(hamburger){
    hamburger.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      if(sideMenu.classList.contains('open')) closeMenu();
      else openMenu();
    };
  }
  if(closeBtn) closeBtn.onclick = closeMenu;
  if(backdrop) backdrop.onclick = closeMenu;

  var links = document.querySelectorAll('.side-menu a');
  for(var i=0;i<links.length;i++){
    links[i].addEventListener('click', closeMenu);
  }

  var forms = document.querySelectorAll('.cta-form');
  for(var j=0;j<forms.length;j++){
    forms[j].addEventListener('submit', function(e){
      e.preventDefault();
      var email = this.querySelector('input').value;
      alert('🚀 Welcome to Apex IPO Access, ' + email + '!');
      this.reset();
    });
  }
});

// === Scroll fade-in for duo section ===
const duoObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting){
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.duo').forEach(el => duoObserver.observe(el));

// === Hero slideshow + caption crossfade ===
(function(){
  const slides = document.querySelectorAll('.slideshow .slide');
  const captions = document.querySelectorAll('.caption-slide');
  if(slides.length < 2) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove('active');
    if(captions[current]) captions[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
    if(captions[current]) captions[current].classList.add('active');
  }, 5000); // change every 5 seconds
})();
