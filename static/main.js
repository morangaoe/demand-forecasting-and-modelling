function renderStars(container){
  const val = parseFloat(container.dataset.score || '0');
  const full = Math.round(val * 2) / 2; // half rounding if needed
  let text = '';
  for (let i=1;i<=5;i++){
    if (i <= Math.floor(full)) text += '★';
    else if (i - full === 0.5) text += '☆';
    else text += '☆';
  }
  container.textContent = text;
}

function initDisplayStars(){
  document.querySelectorAll('.stars').forEach(renderStars);
}

function initInteractiveStars(){
  const input = document.getElementById('score-input');
  const wrapper = document.querySelector('.star-input');
  if (!wrapper || !input) return;
  wrapper.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const score = parseInt(btn.dataset.score);
      input.value = String(score);
      wrapper.dataset.selected = String(score);
      wrapper.querySelectorAll('.star-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.score) <= score);
      });
    });
  });
}

function initAjaxRating(){
  const form = document.getElementById('rate-form');
  const feedback = document.getElementById('rate-feedback');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    const score = parseInt(document.getElementById('score-input').value || '0');
    if (score < 1 || score > 5) return; // let server handle if invalid
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    try{
      const res = await fetch('/rate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.ok){
        feedback.hidden = false;
        const stars = document.querySelector('header .stars');
        const meta = document.querySelector('header .meta');
        if (stars && meta){
          stars.dataset.score = String(data.stats.avg);
          renderStars(stars);
          meta.textContent = `Average ${data.stats.avg} from ${data.stats.count} ratings`;
        }
        form.reset();
        document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
      }
    }catch(err){
      console.error(err);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDisplayStars();
  initInteractiveStars();
  initAjaxRating();
});

