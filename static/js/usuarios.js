function abrirModalEditarUsuario(id, username, access_level) {
  document.getElementById('edit-id-usuario').value = id;
  document.getElementById('edit-username').value = username;
  document.getElementById('edit-access-level').value = access_level;
  document.getElementById('edit-password').value = '';
  document.getElementById('modalEditarUsuario').style.display = 'block';
}

function fecharModalEditarUsuario() {
  document.getElementById('modalEditarUsuario').style.display = 'none';
}

function abrirModalAdicionarUsuario() {
  document.getElementById('add-username').value = '';
  document.getElementById('add-access-level').value = 'user';
  document.getElementById('add-password').value = '';
  document.getElementById('modalAdicionarUsuario').style.display = 'flex';
}

function fecharModalAdicionarUsuario() {
  document.getElementById('modalAdicionarUsuario').style.display = 'none';
}

// Edição de usuário via AJAX
document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('formEditarUsuario');
  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      var id = document.getElementById('edit-id-usuario').value;
      var username = document.getElementById('edit-username').value;
      var access_level = document.getElementById('edit-access-level').value;
      var password = document.getElementById('edit-password').value;

      var params = 'username=' + encodeURIComponent(username) +
                   '&access_level=' + encodeURIComponent(access_level) +
                   '&password=' + encodeURIComponent(password);

      fetch('/editar_usuario/' + id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: params
      })
      .then(response => {
        if (response.ok) {
          fecharModalEditarUsuario();
          window.location.reload();
        } else {
          alert('Erro ao editar usuário');
        }
      });
    };
  }
});

// Adicionar usuário via AJAX
document.addEventListener('DOMContentLoaded', function() {
  var formAdd = document.getElementById('formAdicionarUsuario');
  if (formAdd) {
    formAdd.onsubmit = function(e) {
      e.preventDefault();
      var username = document.getElementById('add-username').value;
      var access_level = document.getElementById('add-access-level').value;
      var password = document.getElementById('add-password').value;

      var params = 'username=' + encodeURIComponent(username) +
                   '&access_level=' + encodeURIComponent(access_level) +
                   '&password=' + encodeURIComponent(password);

      fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: params
      })
      .then(response => {
        if (response.ok) {
          fecharModalAdicionarUsuario();
          window.location.reload();
        } else {
          response.text().then(msg => alert(msg || 'Erro ao adicionar usuário'));
        }
      });
    };
  }
});