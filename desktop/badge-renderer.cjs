window.plinthBadge.onState((value) => {
  document.getElementById('state').textContent = value.text;
  document.getElementById('org').textContent = value.name;
});
document.getElementById('pause').onclick = () => window.plinthBadge.pause();
