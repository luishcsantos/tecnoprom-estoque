// Adicione ao final do categorias.html ou em static/js/categorias.js
function abrirModalEditar(id, nome) {
  document.getElementById('edit-id-categ').value = id;
  document.getElementById('edit-categoria').value = nome;
  document.getElementById('modalEditarCategoria').style.display = 'block';
}

function fecharModalEditar() {
  document.getElementById('modalEditarCategoria').style.display = 'none';
}

// Envia o formulário via AJAX
document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('formEditarCategoria');
  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      var id = document.getElementById('edit-id-categ').value;
      var nome = document.getElementById('edit-categoria').value;

      fetch('/editar_categoria/' + id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'categoria=' + encodeURIComponent(nome)
      })
      .then(response => {
        if (response.ok) {
          fecharModalEditar();
          window.location.reload(); // Atualiza a tabela
        } else {
          alert('Erro ao editar categoria');
        }
      });
    };
  }
});