function abrirModalEditar(id, nome) {
  document.getElementById('edit-id-pack').value = id;
  document.getElementById('edit-encapsulamento').value = nome;
  document.getElementById('modalEditarCategoria').style.display = 'block';
}

function fecharModalEditar() {
  document.getElementById('modalEditarCategoria').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('formEditarCategoria');
  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      var id = document.getElementById('edit-id-pack').value;
      var nome = document.getElementById('edit-encapsulamento').value;

      fetch('/editar_encapsulamento/' + id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'package=' + encodeURIComponent(nome)
      })
      .then(response => {
        if (response.ok) {
          fecharModalEditar();
          window.location.reload();
        } else {
          alert('Erro ao editar encapsulamento');
        }
      });
    };
  }
});