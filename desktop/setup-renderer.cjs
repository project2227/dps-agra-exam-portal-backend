document.getElementById('form').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await window.plinthSetup.site(document.getElementById('url').value);
  } catch (error) {
    document.getElementById('error').textContent = error.message;
  }
};
