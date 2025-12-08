document.addEventListener('DOMContentLoaded', function() {
  const now = new Date();

  // Data
  const dataFormatada = now.toLocaleDateString('pt-BR');
  const dateElement = document.getElementById('date');
  if (dateElement) {
    dateElement.textContent = dataFormatada;
  }

  // Hora (HH:mm)
  const timeElement = document.getElementById('time');
  if (timeElement) {
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    timeElement.textContent = `${hh}:${mm}`;
  }

  // pop-up realizar pedidos 
  const abrirPopupBtn = document.getElementById('abrirPopup');
  const popup         = document.getElementById('pedidosPopup');
  const fecharPopup   = document.querySelector('.fechar-popup');
  if (abrirPopupBtn && popup && fecharPopup) {
    abrirPopupBtn.addEventListener('click', () => popup.style.display = 'flex');
    fecharPopup.addEventListener('click', () => popup.style.display = 'none');
    popup.addEventListener('click', e => {
      if (e.target === popup) popup.style.display = 'none';
    });
  }
});
