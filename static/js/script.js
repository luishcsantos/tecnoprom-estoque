//Reload script for development ao salvar
document.addEventListener('DOMContentLoaded', () => {

    // 1) btn-limpar
    const btnLimpar = document.getElementById('btn-limpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparCampos);
    }

    // 2) btn-novo
    const btnNovo = document.getElementById('btn-novo');
    if (btnNovo) {
        btnNovo.addEventListener('click', adicionarComponenteHandler);
    }

    // 3) form editar
    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
        formEditar.onsubmit = editarComponenteHandler;
    }

    // 4) fechar modal
    const btn = document.getElementById('fechar-modal-editar');
    if (btn) btn.onclick = fecharModalEditar;

    // 5) populando os selects do modal (só se eles existirem)
    const editCat = document.getElementById('edit-categoria');
    const selCat = document.getElementById('categoria-select');
    const editEnc = document.getElementById('edit-encapsulamento');
    const selEnc = document.getElementById('encapsulamento-select');

    if (editCat && selCat) {
        editCat.innerHTML = selCat.innerHTML;
    }
    if (editEnc && selEnc) {
        editEnc.innerHTML = selEnc.innerHTML;
    }

    // Só inicializa a tabela se ela existir na página atual E se for a página de estoque
    if (document.querySelector('.tabela-componentes') && document.getElementById('descricao')) {
        filtrarTabela();
        attachRowListeners();
    }

    // 8) evento de submit do botão de adicionar Pedido
    const btnPedido = document.getElementById('btn-adicionar-pedido');
    if (btnPedido) {
        btnPedido.addEventListener('click', adicionarPedidoHandler);
    }

    const btnOs = document.getElementById('btn-adicionar-Os');
    if (btnOs) {
        btnOs.addEventListener('click', adicionarOsHandler);
    }

    const btnSgp = document.getElementById('btn-adicionar-Sgp');
    if (btnSgp) {
        btnSgp.addEventListener('click', adicionarSgpHandler);
    }

    // abre modal de senha ao clicar na imagem do usuário (só se existir)
    const userImg = document.querySelector('.content-user .user');
    if (userImg) {
        userImg.addEventListener('click', abrirModalSenha);
    }

    // Intercepta o submit do form de senha
    const formSenha = document.getElementById('form-senha');
    if (formSenha) {
        formSenha.onsubmit = alterarSenhaHandler;
    }

    const inpDesc = document.getElementById('descricao');
    if (inpDesc) {
        inpDesc.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const v = inpDesc.value.trim();
                if (v && v.length < 2) {
                    alert('Digite pelo menos 2 caracteres para pesquisar.');
                } else {
                    filtrarTabela();
                }
            }
        });
    }

    // BntBuscar
    const btnBuscar = document.getElementById('btn-buscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            const v = inpDesc.value.trim();
            if (v && v.length < 2) {
                alert('Digite pelo menos 2 caracteres para pesquisar.');
            } else {
                filtrarTabela();
            }
        });
    }

    // 9 Fechar modal editar pedido
    const btnFecharPedido = document.getElementById('fechar-modal-editar-pedido');
    if (btnFecharPedido) {
        btnFecharPedido.addEventListener('click', fecharModalEditarPedido);
    }

    // 10) submit do form de editar pedido – agora dentro do DOMContentLoaded
    const formEditarPedido = document.getElementById('form-editar-pedido');
    if (formEditarPedido) {
        formEditarPedido.onsubmit = function (e) {
            e.preventDefault();
            const id = document.getElementById('edit-pedido-id').value;
            const data_chegada = document.getElementById('edit-data-chegada').value;
            const fornecedor_pedidos = document.getElementById('edit-fornecedor').value;
            const obs_pedidos = document.getElementById('edit-obs-pedidos').value;

            // validações
            if (!data_chegada) {
                alert('Por favor, preencha a data de chegada.');
                return;
            }
            const selecionada = new Date(data_chegada);
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            if (selecionada <= hoje) {
                alert('A data de chegada deve ser posterior à data atual.');
                return;
            }
            fetch(`/editar_pedido/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comprado: true, data_chegada, fornecedor: fornecedor_pedidos, obs: obs_pedidos })
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        alert('Pedido atualizado!');
                        fecharModalEditarPedido();
                        carregarPedidos();
                    } else {
                        alert(res.error || 'Erro ao atualizar pedido.');
                    }
                })
                .catch(() => alert('Erro ao atualizar pedido.'));
        };
    }

    // abre / fecha popups de pedido and Sgp
    const btnAbrirPedido = document.getElementById('abrirPopup');
    const pedidoPopup = document.getElementById('pedidosPopup');
    const fecharPedido = pedidoPopup?.querySelector('.fechar-popup');
    const btnAbrirSgp = document.getElementById('abrirSgpPopup');
    const SgpPopup = document.getElementById('SgpPopup');
    const fecharSgp = SgpPopup?.querySelector('.fechar-popup');


    if (btnAbrirPedido && pedidoPopup) {
        btnAbrirPedido.addEventListener('click', () => pedidoPopup.style.display = 'flex');
    }
    if (fecharPedido) {
        fecharPedido.addEventListener('click', () => pedidoPopup.style.display = 'none');
    }

    if (btnAbrirSgp && SgpPopup) {
        btnAbrirSgp.addEventListener('click', () => SgpPopup.style.display = 'flex');
    }
    if (fecharSgp) {
        fecharSgp.addEventListener('click', () => SgpPopup.style.display = 'none');
    }

    // Botão imprimir: chama a caixa de impressão
    const btnImprimir = document.getElementById('imprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', e => {
            e.preventDefault();
            window.print();
        });
    }

    //Editar OS

    const formOsEdit = document.getElementById('form-os-edit');
    if (formOsEdit) {
        formOsEdit.onsubmit = async function (e) {
            e.preventDefault();
            const form = e.target;
            const id = form.elements.id.value;
            
            // 1. Coleta dados básicos
            const data = {
                data_abertura: form.elements.data_abertura.value,
                status: form.elements.status.value,
                n_os: form.elements.n_os.value,
                cliente: form.elements.cliente.value,
                equipamento: form.elements.equipamento.value,
                tecnico_responsavel: form.elements.tecnico_responsavel.value,
                data_aprovacao: form.elements.data_aprovacao.value,
                // tempo_conserto: form.elements.tempo_conserto.value,
                // data_entrega: form.elements.data_entrega.value,
                // dias_atraso: form.elements.dias_atraso.value,
                observacoes: form.elements.observacoes.value
            };
            
            // 2. Adiciona valor_servico SOMENTE se o campo existir no DOM (para usuários autorizados)
            const valorServicoElement = form.elements.valor_servico;
            if (valorServicoElement) {
                data.valor_servico = valorServicoElement.value;
            }

            const resp = await fetch(`/editar-os/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const msg = await resp.json();
            const msgElem = document.getElementById('msg-os-edit');
            msgElem.innerText = msg.message || msg.error || 'Erro desconhecido.';
            if (resp.ok) {
                msgElem.style.color = 'green';
                setTimeout(() => window.location.reload(), 1000);
            } else {
                msgElem.style.color = 'red';
            }
        };
    }

    // Adicionar Os
    const formOsAdd = document.getElementById('form-os-add');
    if (formOsAdd) {
        formOsAdd.onsubmit = async function (e) {
            e.preventDefault();
            const form = e.target;

            const data = {
                data_abertura: form.elements.data_abertura.value,
                status: form.elements.status.value,
                n_os: form.elements.n_os.value,
                cliente: form.elements.cliente.value,
                equipamento: form.elements.equipamento.value,
                tecnico_responsavel: form.elements.tecnico_responsavel.value,
                valor_servico: form.elements.valor_servico?.value || '',
                data_aprovacao: form.elements.data_aprovacao.value,
                // tempo_conserto: form.elements.tempo_conserto.value,
                // data_entrega: form.elements.data_entrega.value,
                // dias_atraso: dias_atraso,
                observacoes: form.elements.observacoes.value
            };

            const resp = await fetch('/adicionar-os', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const msg = await resp.json();
            const msgElem = document.getElementById('msg-os-add');
            if (msgElem) {
                msgElem.innerText = msg.message || msg.error || '';
                msgElem.style.color = resp.ok ? 'green' : 'red';
            }
            if (resp.ok) {
                setTimeout(() => window.location.reload(), 1000);
            }
        };
    }

    // --- LÓGICA PARA ADICIONAR SGP ---
    const form = document.getElementById('form-sgp-add');
    if (form) {
        form.onsubmit = async function (e) {
            e.preventDefault();
            const data = {
                data: form.elements.data.value,
                vendedor: form.elements.vendedor.value,
                descricao: form.elements.descricao.value,
                numero_pedido: form.elements.numero_pedido.value,
                cliente: form.elements.cliente.value,
                previsao_entrega: form.elements.previsao_entrega.value,
                observacao1: form.elements.observacao1.value
            };

            const resp = await fetch('/adicionar-sgp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const msg = await resp.json();
            const msgElem = document.getElementById('msg-sgp-add');
            if (msgElem) {
                msgElem.innerText = msg.message || msg.error || '';
                msgElem.style.color = resp.ok ? 'green' : 'red';
            }
            if (resp.ok) {
                setTimeout(() => window.location.reload(), 1000);
            }
        };
    };
    // Olhinho para mostrar/ocultar senha no login
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');

if (togglePassword && passwordInput && eyeIcon) {
    togglePassword.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    });
}

});

// Global variables to store the last applied filter
let gLastCategoriaFilter = '';
let gLastEncapsulamentoFilter = '';
let gLastDescricaoFilter = '';

// Função de limpeza dos campos
function limparCampos() {
    document.getElementById('descricao').value = '';
    document.getElementById('local').value = '';


    // Resetar selects
    document.getElementById('categoria-select').selectedIndex = 0;
    document.getElementById('encapsulamento-select').selectedIndex = 0;

    // Resetar imagem
    document.getElementById('imagem-item').src = '/static/img/itens/sem-foto.png';
    document.getElementById('observacoes').value = '';

    // Refiltra a tabela
    filtrarTabela();
}

// Função para buscar componentes com filtros
function filtrarTabela(useStoredFilters = false) {
    const selCat = document.getElementById('categoria-select');
    const selEnc = document.getElementById('encapsulamento-select');
    const inpDesc = document.getElementById('descricao');
    if (!selCat || !selEnc || !inpDesc) {
        // não há tabela ou filtros nesta página
        return;
    }

    let descricao = inpDesc.value.trim();
    // cancela se tiver de 1 a 2 caracteres
    if (descricao.length > 0 && descricao.length < 2) {
        const tbody = document.querySelector('.tabela-componentes tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Digite ao menos 2 caracteres</td></tr>';
        return;
    }

    let categoria, encapsulamento;

    if (useStoredFilters) {
        categoria = gLastCategoriaFilter;
        encapsulamento = gLastEncapsulamentoFilter;
        descricao = gLastDescricaoFilter;

        // Optionally, update the DOM elements to reflect these stored values
        selCat.value = categoria;
        selEnc.value = encapsulamento;
        inpDesc.value = descricao;
    } else {
        categoria = selCat.value;
        encapsulamento = selEnc.value;

        // Update global stored filters as a new filter is being applied
        gLastCategoriaFilter = categoria;
        gLastEncapsulamentoFilter = encapsulamento;
        gLastDescricaoFilter = descricao;
    }

    fetch(`/filtrar_componentes?categoria=${categoria}&encapsulamento=${encapsulamento}&descricao=${encodeURIComponent(descricao)}`)
        .then(r => r.json())
        .then(data => {
            const tbody = document.querySelector('.tabela-componentes tbody');
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum componente encontrado</td></tr>';
            } else {
                data.forEach(item => {
                    let row = '';

                    if (window.isAdmin) {
                        row = `
                        <tr data-id="${item.id}">
                            <td>${item.id}</td>
                            <td>${item.descr}</td>
                            <td>${item.categ}</td>
                            <td>${item.encaps}</td>
                            <td>${item.local}</td>
                            <td>${item.obs}</td>
                            <td>
                            <button class="btn-editar" onclick="abrirModalEditar(${item.id})">Editar</button>
                            <button class="btn-excluir" onclick="event.stopPropagation(); deletarComponente(${item.id})">Excluir</button>
                            </td>
                            </tr>
                        `;
                    }
                    else {
                        row = `
                        <tr data-id="${item.id}">
                            <td>${item.id}</td>
                            <td>${item.descr}</td>
                            <td>${item.categ}</td>
                            <td>${item.encaps}</td>
                            <td>${item.local}</td>
                            <td>${item.obs}</td>
                            </tr>
                        `;
                    }
                    console.log(window.isAdmin)

                    tbody.insertAdjacentHTML('beforeend', row);

                });
            }

            attachRowListeners();
        });
}

// CORREÇÃO PRINCIPAL: Vincula o clique apenas a linhas com 'data-id'
function attachRowListeners() {
    document.querySelectorAll('.tabela-componentes tbody tr[data-id]').forEach(tr => {
        tr.style.cursor = 'pointer';
        tr.onclick = () => carregarDetalhes(tr.dataset.id);
    });
}


function deletarComponente(id) {
    if (!confirm('Tem certeza que deseja excluir este componente?')) return;

    fetch(`/deletar_componente/${id}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url; // Caso sessão expire
            } else if (response.ok) {
                filtrarTabela(); // Atualiza a tabela após deletar
            } else {
                alert('Erro ao excluir componente!');
            }
        })
        .catch(() => alert('Erro ao excluir componente!'));
}

// Função para abrir o modal e preencher os campos
function abrirModalEditar(id) {
    fetch(`/componente/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-descricao').value = data.descr || '';
            document.getElementById('edit-categoria').value = getCategoriaIdByNome(data.categ);
            document.getElementById('edit-encapsulamento').value = getEncapsulamentoIdByNome(data.encaps);
            document.getElementById('edit-local').value = data.local || '';
            document.getElementById('edit-obs').value = data.obs || '';
            document.getElementById('modal-editar').style.display = 'flex';
        });
}

// torna a função visível globalmente (para o onclick inline)
function fecharModalEditar() {
    const modal = document.getElementById('modal-editar');
    if (modal) modal.style.display = 'none';
}

function adicionarComponenteHandler() {
    const dados = {
        descricao: document.getElementById('descricao').value,
        categoria: document.getElementById('categoria-select').value,
        encapsulamento: document.getElementById('encapsulamento-select').value,
        local: document.getElementById('local').value,
        observacoes: document.getElementById('observacoes').value,
    };

    fetch('/adicionar-componente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })
        .then(r => r.json().then(j => ({ status: r.status, body: j })))
        .then(({ status, body }) => {
            if (status === 200) {
                alert(body.message);
                filtrarTabela();
                limparCampos();
            } else {
                alert(body.error || 'Erro desconhecido');
            }
        })
        .catch(err => alert('Erro na requisição: ' + err));
}

function editarComponenteHandler(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const dados = {
        descr: document.getElementById('edit-descricao').value,
        categ: document.getElementById('edit-categoria').value,
        encaps: document.getElementById('edit-encapsulamento').value,
        local: document.getElementById('edit-local').value,
        obs: document.getElementById('edit-obs').value
    };

    fetch(`/editar/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams(dados).toString()
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Erro na resposta do servidor');
        })
        .then(data => {
            alert('Componente atualizado com sucesso!');
            document.getElementById('modal-editar').style.display = 'none';
            filtrarTabela(true);
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao atualizar componente!');
        });
}

// Funções auxiliares para pegar o ID pelo nome (ajuste conforme seu backend)
function getCategoriaIdByNome(nome) {
    const select = document.getElementById('categoria-select');
    for (let option of select.options) {
        if (option.text === nome) return option.value;
    }
    return '';
}
function getEncapsulamentoIdByNome(nome) {
    const select = document.getElementById('encapsulamento-select');
    for (let option of select.options) {
        if (option.text === nome) return option.value;
    }
    return '';
}

// CORREÇÃO: Adiciona uma verificação para evitar a chamada com ID 'undefined'
function carregarDetalhes(id) {
    if (!id) return;
    fetch(`/componente/${id}`)
        .then(r => {
            if (!r.ok) {
                throw new Error(`HTTP error! status: ${r.status}`);
            }
            return r.json();
        })
        .then(data => {
            document.getElementById('local').value = data.local || '';
            document.getElementById('descricao').value = data.descr || '';
            document.getElementById('categoria-select').value = getCategoriaIdByNome(data.categ);
            document.getElementById('encapsulamento-select').value = getEncapsulamentoIdByNome(data.pack);
            document.getElementById('observacoes').value = data.obs || '';
            document.getElementById('imagem-item').src = `/static/img/itens/${id}.png`;

            document.getElementById('edit-id').value = id;
            document.getElementById('edit-descricao').value = data.descr || '';
            document.getElementById('edit-categoria').value = getCategoriaIdByNome(data.categ);
            document.getElementById('edit-encapsulamento').value = getEncapsulamentoIdByNome(data.pack);
            document.getElementById('edit-local').value = data.local || '';
            document.getElementById('edit-obs').value = data.obs || '';
        })
        .catch(err => console.error('Erro ao carregar detalhes:', err));
}

function toggleMenu() {
    const nav = document.querySelector('.nav-menu');
    nav.classList.toggle('open');
}

// Fecha o menu ao clicar fora (opcional)
document.addEventListener('click', function (e) {
    const nav = document.querySelector('.nav-menu');
    const btn = document.querySelector('.menu-toggle');
    // Se não encontrar elementos, não faz nada
    if (!nav || !btn) return;
    if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('open');
    }
});

function abrirModalSenha() {
    document.getElementById('modal-senha').classList.add('show');
}

function fecharModalSenha() {
    document.getElementById('modal-senha').classList.remove('show');
}

function alterarSenhaHandler(e) {
    e.preventDefault();
    const form = e.target;
    const dados = new FormData(form);

    fetch('/alterar_senha', {
        method: 'POST',
        body: dados
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                alert(res.success);
                fecharModalSenha();
                form.reset();
            } else {
                alert(res.error || 'Erro ao alterar senha.');
            }
        })
        .catch(() => alert('Erro ao alterar senha.'));
}

//Adicionar Pedido
function adicionarPedidoHandler() {
    const dados = {
        componente: document.getElementById('componente').value,
        link: document.getElementById('link').value,
        // fornecedor: document.getElementById('fornecedor').value,
        quantidade: document.getElementById('quantidade').value,
        urgente: document.getElementById('urgente').checked,
        motivo: document.getElementById('motivo').value
    };

    fetch('/adicionar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })
        .then(r => r.json().then(j => ({ status: r.status, body: j })))
        .then(({ status, body }) => {
            if (status === 200) {
                alert(body.message);
                // fecha popup
                document.getElementById('pedidosPopup').style.display = 'none';
                // recarrega tabela de pedidos
                if (typeof carregarPedidos === 'function') carregarPedidos();
                // limpa campos
                document.getElementById('componente').value = '';
                document.getElementById('link').value = '';
                // document.getElementById('fornecedor').value = '';
                document.getElementById('quantidade').value = '';
                document.getElementById('urgente').checked = false;
                document.getElementById('motivo').value = '';

                carregarPedidos();
            } else {
                alert(body.error || 'Erro desconhecido');
            }
        })
        .catch(err => alert('Erro na requisição: ' + err));
}

// Carregar pedidos na tabela
function carregarPedidos() {
    const selComprado = document.getElementById('comprado-select');
    const selStatus = document.getElementById('status-select');
    const selRequisitante = document.getElementById('requisitante-select');
    const selData = document.getElementById('Data-select');
    const inpComponente = document.getElementById('componente-search');

    let url = '/api/pedidos';
    const params = {};

    if (selComprado && selComprado.value !== '') {
        params.comprado = selComprado.value === 'Sim' ? 'true' : 'false';
    }
    if (selStatus && selStatus.value !== '') {
        params.status = selStatus.value === 'true' ? 'true' : 'false';
    }
    if (selRequisitante && selRequisitante.value.trim()) {
        params.requisitante = selRequisitante.value.trim();
    }
    if (selData && selData.value) {
        params.data = selData.value;
    }
    
    // NOVO FILTRO: Pesquisa por componente
    if (inpComponente && inpComponente.value.trim()) {
        params.componente_search = inpComponente.value.trim();
    }

    // Constrói a query string
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    fetch(url)
        .then(r => r.json())
        .then(pedidos => {
            const tbody = document.querySelector('#tabelaPedidos tbody');
            tbody.innerHTML = '';

            // ... (o restante da função 'carregarPedidos' permanece o mesmo)
            pedidos.forEach(p => {
                const tr = document.createElement('tr');

                if (p.obs) {
                    tr.classList.add('mostra-obs');
                    tr.setAttribute('title', p.obs);
                }

                let rawLink = p.link_componentes || '';
                if (rawLink && !/^https?:\/\//i.test(rawLink)) {
                    rawLink = 'https://' + rawLink;
                }

                const isUrgente = p.urgente === true || p.urgente === 1;

                if (p.comprado) {
                    tr.classList.add('pedido-comprado');
                } else {
                    tr.classList.add('pedido-nao-comprado');
                }

                if (isUrgente && !p.comprado) {
                    tr.classList.add('pedido-urgente');
                    tr.classList.remove('pedido-nao-comprado');
                } else {
                    tr.classList.add('pedido-nao-urgente');
                }

                if (p.status) {
                    tr.classList.remove('pedido-nao-urgente');
                    tr.classList.remove('pedido-urgente');
                    tr.classList.remove('pedido-comprado');
                    tr.classList.remove('pedido-nao-comprado');
                    tr.classList.add('pedido-chegou');
                }
                // ... (código para preencher a linha da tabela)
                tr.innerHTML = `
                    <td>${p.data}</td>
                    <td>${p.componentes}</td>
                    <td>${p.fornecedor}</td>
                    <td>${p.quant}</td>
                    <td>${p.urgente ? 'Sim' : 'Não'}</td>
                    <td>${p.requisitante || ''}</td>
                    <td>${p.motivo || ''}</td>
                    <td class="link-cell">
                        <a href="${rawLink}" target="_blank" rel="noopener noreferrer">
                            ${p.link_componentes || ''}
                        </a>
                    </td>
                    <td>
                        <input type="checkbox"
                               class="comprado-checkbox"
                               ${p.comprado ? 'checked' : ''}
                               ${(window.isAdmin || window.isComprador) ? '' : 'disabled'}>
                    </td>
                    <td>${p.comprador || ''}</td>
                    <td>${p.data_compra || ''}</td>
                    <td>${p.data_chegada || ''}</td>
                    <td>
                        <input type="checkbox"
                               class="selecionar-pedido"
                               data-id="${p.id}"
                               ${p.status ? 'checked' : ''}
                               ${(window.isAdmin || window.isComprador) ? '' : 'disabled'}>
                    </td>
                    ${(window.isAdmin || p.requisitante == window.currentUser) ? `
                        <td>
                            <button class="btn-excluir" onclick="event.stopPropagation(); deletarPedido(${p.id})">Excluir</button>
                        </td>` : ''}
                `;

                // Event listeners para checkboxes
                const chkComprado = tr.querySelector('.comprado-checkbox');
                if (window.isAdmin || window.isComprador) {
                    chkComprado.addEventListener('change', () => {
                        if (chkComprado.checked) {
                            abrirModalEditarPedido(p);
                        }
                    });
                }

                const chkStatus = tr.querySelector('.selecionar-pedido');
                if (window.isAdmin || window.isComprador) {
                    chkStatus.addEventListener('change', () => {
                        fetch(`/atualizar_status/${p.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: chkStatus.checked })
                        })
                            .then(handleResponse)
                            .then(() => carregarPedidos())
                            .catch(handleError);
                    });
                }
                tbody.appendChild(tr);
            });
        })
        .catch(handleError);
}

// Funções auxiliares
function handleResponse(response) {
    if (!response.ok) throw new Error('Erro na rede');
    return response.json();
}

function handleError(error) {
    console.error('Erro:', error);
    alert('Ocorreu um erro ao processar a solicitação');
}

// Modal editar pedido
function abrirModalEditarPedido(pedido) {
    document.getElementById('modal-editar-pedido').style.display = 'flex';
    document.getElementById('edit-pedido-id').value = pedido.id;
    document.getElementById('edit-data-chegada').value = pedido.data_chegada
        ? formatarDataInput(pedido.data_chegada)
        : '';
    document.getElementById('edit-fornecedor').value = pedido.fornecedor || '';
    document.getElementById('edit-obs-pedidos').value = pedido.obs || '';
}

const fecharModalEditarPedidoBtn = document.getElementById('fechar-modal-editar-pedido');
if (fecharModalEditarPedidoBtn) {
    fecharModalEditarPedidoBtn.onclick = fecharModalEditarPedido;
}

function fecharModalEditarPedido() {
    document.getElementById('modal-editar-pedido').style.display = 'none';
}

function fecharModalEditarOs() {
    document.getElementById('modal-editar-os').style.display = 'none';
}

// Salvar edição do pedido (protege contra null)
const formEditarPedido = document.getElementById('form-editar-pedido');

if (formEditarPedido) {
    formEditarPedido.onsubmit = function (e) {
        e.preventDefault();

        const id = document.getElementById('edit-pedido-id').value;
        const data_chegada = document.getElementById('edit-data-chegada').value;
        const fornecedor_pedidos = document.getElementById('edit-fornecedor').value;
        const obs_pedidos = document.getElementById('edit-obs-pedidos').value;

        // 1) Verifica se foi preenchido
        if (!data_chegada) {
            alert('Por favor, preencha a data de chegada.');
            return;
        }
        // 2) Só permite data maior que hoje
        const selecionada = new Date(data_chegada);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (selecionada <= hoje) {
            alert('A data de chegada deve ser posterior à data atual.');
            return;
        }

        fetch(`/editar_pedido/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comprado: true, data_chegada, fornecedor: fornecedor_pedidos, obs: obs_pedidos })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    alert('Pedido atualizado!');
                    fecharModalEditarPedido();
                    carregarPedidos();
                } else {
                    alert(res.error || 'Erro ao atualizar pedido.');
                }
            })
            .catch(() => alert('Erro ao atualizar pedido.'));
    };
}

function deletarPedido(id) {
    if (!confirm('Tem certeza que deseja deletar o pedido?')) return;

    fetch(`/excluir_pedido/${id}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url; // Caso sessão expire
            } else if (response.ok) {
                carregarPedidos(); // Atualiza a tabela após deletar
            } else {
                alert('Erro ao excluir pedido!');
            }
        })
        .catch(() => alert('Erro ao excluir pedido!'));
}
// torna a função visível globalmente (para o onclick inline)
window.excluir_pedido = deletarPedido;

// Helper para converter data dd/mm/yyyy para yyyy-mm-dd
function formatarDataInput(data) {
    if (!data) return '';
    const [dia, mes, ano] = data.split('/'); return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}// Carregar pedidos ao abrir a página pedidos.html
if (window.location.pathname.includes('/pedidos')) {
    carregarPedidos();
}

// Carregar ordens de serviço na tabela
async function carregarOrdemServ() {
    try {
        const resp = await fetch('/api/ordem_serv');
        if (!resp.ok) {
            throw new Error('Erro ao carregar ordens de serviço.');
        }
        const data = await resp.json();

        // 1. Pré-processa os dados para calcular os dias de atraso e a data de entrega esperada (20 dias após aprovação)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const msPerDay = 1000 * 60 * 60 * 24;

        const dadosComAtraso = data.map(os => {
            let dias_atraso = 0;
            let dataEntregaCalculada = null; // Data esperada para entrega (20 dias após a aprovação)
            let dataEntregaDisplay = '';    // String para exibição (DD/MM/YYYY)
            let isAtrasada = false;         // Flag para determinar o estilo

            // 1.1 Calcular a Data de Entrega Esperada (20 dias após a aprovação)
            if (os.data_aprovacao) {
                const dataAprovacaoDate = new Date(os.data_aprovacao + "T00:00:00");
                dataEntregaCalculada = new Date(dataAprovacaoDate);
                dataEntregaCalculada.setDate(dataEntregaCalculada.getDate() + 20);
                dataEntregaDisplay = dataEntregaCalculada.toLocaleDateString('pt-BR');
            }

            // 1.2. Calcular Dias de Atraso/Restantes
            if (dataEntregaCalculada && os.status !== "Finalizada") {
                const diffTime = dataEntregaCalculada - hoje; // Diferença: Data Entrega - Hoje (pode ser + ou -)

                if (diffTime < 0) {
                    // Atrasado: resultado deve ser negativo (-5 para 5 dias de atraso).
                    dias_atraso = Math.ceil(diffTime / msPerDay);
                    isAtrasada = dias_atraso < 0;
                    
                    // Tratamento para atraso sub-24h que pode resultar em 0.
                    if (dias_atraso === 0 && dataEntregaCalculada < hoje) {
                         dias_atraso = -1;
                         isAtrasada = true;
                    }
                } else {
                    // Em dia/Restante: resultado deve ser positivo (12 para 12 dias restantes).
                    dias_atraso = Math.floor(diffTime / msPerDay);
                    isAtrasada = false;
                }
            } else {
                isAtrasada = false;
            }

            return { ...os, dias_atraso, dataEntregaDisplay, isAtrasada }; // Adiciona campos calculados
        });

        // 2. Ordena os dados
        dadosComAtraso.sort((a, b) => {

            // 2.1 Finalizadas por último
            const aFinalizada = a.status === "Finalizada";
            const bFinalizada = b.status === "Finalizada";
            if (aFinalizada && !bFinalizada) return 1;
            if (!aFinalizada && bFinalizada) return -1;

            // 2.2 Atrasadas no topo, ordenadas do mais atrasado (-10 antes de -5)
            const aAtrasado = a.isAtrasada;
            const bAtrasado = b.isAtrasada;

            if (aAtrasado && !bAtrasado) return -1;
            if (!aAtrasado && bAtrasado) return 1;

            if (aAtrasado && bAtrasado) {
                return a.dias_atraso - b.dias_atraso; // Ordem Crescente (mais negativo primeiro)
            }

            // 2.3 Demais: ordenadas da mais antiga para a mais recente (usando a data de aprovação)
            const dateA = a.data_aprovacao ? new Date(a.data_aprovacao) : new Date(0);
            const dateB = b.data_aprovacao ? new Date(b.data_aprovacao) : new Date(0);
            return dateA - dateB;
        });

        const table = document.querySelector('.tabela-componentes');
        let tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.remove();
        }
        tbody = document.createElement('tbody');

        // 3. Renderiza a tabela com os dados já ordenados
        dadosComAtraso.forEach(os => {
            const tr = document.createElement('tr');
            tr.dataset.id = os.id;
            tr.style.cursor = 'pointer';
            tr.onclick = () => abrirModalEditarOS(os.id);

            if (os.observacoes) {
                tr.classList.add('mostra-obs');
                tr.setAttribute('title', os.observacoes);
            }

            if (os.status === "Finalizada") {
                tr.classList.add('status-finalizada');
            } else if (os.status === "Aguardando material") {
                tr.classList.add('status-aguardando-material');
            }

            // A lógica de dias de atraso agora usa a propriedade pré-calculada isAtrasada
            if (os.isAtrasada) {
                tr.classList.add('dias-atraso-os');
                tr.classList.remove('status-aguardando-material');
            } else {
                tr.classList.remove('dias-atraso-os');
            }

            const dataAbertura = os.data_abertura ? new Date(os.data_abertura + "T00:00:00").toLocaleDateString('pt-BR') : '';
            const dataAprovacao2 = os.data_aprovacao ? new Date(os.data_aprovacao + "T00:00:00").toLocaleDateString('pt-BR') : '';
            const dataAprovacao = os.data_aprovacao ? new Date(os.data_aprovacao + "T00:00:00") : null;
            let dataEntrega = '';
            if (dataAprovacao) {
                const dataEntregaDate = new Date(dataAprovacao);
                dataEntregaDate.setDate(dataEntregaDate.getDate() + 20);
                dataEntrega = dataEntregaDate.toLocaleDateString('pt-BR');
            }

            const tempo_conserto = "20 dias";

            let rowHTML = `
                <td>${dataAbertura}</td>
                <td>${os.status}</td>
                <td>${os.n_os}</td>
                <td>${os.cliente}</td>
                <td>${os.equipamento}</td>
                <td>${os.tecnico_responsavel}</td>
                <td class="valor-servico">${os.valor_servico ? 'R$ ' + Number(os.valor_servico).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}</td>
                <td>${dataAprovacao2}</td>
                <td>${tempo_conserto || ''}</td>
                <td>${dataEntrega}</td>
                <td>${os.dias_atraso || ''}</td>
            `;

            if (window.isAdmin) {
                rowHTML += `<td><button class="btn-excluir" onclick="event.stopPropagation(); deletarOS(${os.id})">Excluir</button></td>`;
            }

            tr.innerHTML = rowHTML;
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);

        // Hide valor_servico column based on access level
        const valorServicoHeader = table.querySelector('thead th:nth-child(7)');
        const valorServicoCells = table.querySelectorAll('tbody td:nth-child(7)');

        // O cabeçalho e as células de valor de serviço podem ter sido removidos pelo Jinja2 no HTML, mas garantimos a visibilidade aqui.
        if (valorServicoHeader) {
            if (window.isAdmin || window.isVendedor_repos || window.isVendedor_serv || window.isdiretoria) {
                valorServicoHeader.classList.remove('hide-valor-servico');
                valorServicoCells.forEach(cell => cell.classList.remove('hide-valor-servico'));
            } else {
                valorServicoHeader.classList.add('hide-valor-servico');
                valorServicoCells.forEach(cell => cell.classList.add('hide-valor-servico'));
            }
        }

        SomaOs();

    } catch (error) {
        console.error('Erro ao carregar e exibir ordens de serviço:', error);
    }
}

//function deletarOS(id) {
//    if (!confirm('Tem certeza que deseja excluir esta Ordem de Serviço?')) return;

//    fetch(`/excluir_os/${id}`, {
//        method: 'POST',
  //      headers: {
    //        'X-Requested-With': 'XMLHttpRequest'
      //  }
    //})
     //   .then(response => {
       //     if (response.ok) {
         //       return response.json();
       //     }
        //    throw new Error('Erro na resposta do servidor');
       // })
        //.then(data => {
         //   if (data.success) {
           //     alert('Ordem de Serviço excluída com sucesso!');
             //   carregarOrdemServ(); // Recarrega a tabela
           // } else {
           //     alert(data.error || 'Erro ao excluir Ordem de Serviço.');
           // }
       // })
       // .catch(error => {
        //    console.error('Erro:', error);
        //    alert('Erro ao excluir Ordem de Serviço!');
       // });
//}
function deletarOS(id) {
    if (!confirm('Tem certeza que deseja excluir esta OS?')) return;

    fetch(`/excluir_os/${id}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Erro na resposta do servidor');
    })
    .then(data => {
        fecharModalOS('modal-os-edit'); 
        if (data.success) {
            alert('OS excluída com sucesso!');
            window.location.reload(); // <-- Adicione isso
        } else {
            alert(data.error || 'Erro ao excluir OS.');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao excluir OS!');
    });
}
window.deletarOS = deletarOS;

// Function to filter the OS table
function filtrarColunaOS(input, column) {
    let filter = input.value.toUpperCase();
    let table = document.querySelector('.tabela-componentes');
    let tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName('td');
        if (td) {
            let textValue = td[getColumnIndex(column)].textContent || td[getColumnIndex(column)].innerText;
            if (textValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

// Helper function to get the column index
function getColumnIndex(column) {
    switch (column) {
        case "status": return 1;
        case "cliente": return 3;
        default: return -1; // Return -1 if column is not found
    }
}

async function abrirModalEditarOS(id) {
    try {
        const resp = await fetch(`/os/${id}`);
        if (!resp.ok) {
            alert('Erro ao buscar dados da OS.');
            return;
        }
        const data = await resp.json();
        const form = document.getElementById('form-os-edit');
        if (!form) {
            alert('Formulário de edição de OS não encontrado!');
            return;
        }

        form.elements.id.value = data.id || '';
        form.elements.data_abertura.value = data.data_abertura || '';
        form.elements.status.value = data.status || '';
        form.elements.n_os.value = data.n_os || '';
        form.elements.cliente.value = data.cliente || '';
        form.elements.equipamento.value = data.equipamento || '';
        form.elements.tecnico_responsavel.value = data.tecnico_responsavel || '';
        if (form.elements.valor_servico) {
            form.elements.valor_servico.value = data.valor_servico || '';
        }
        form.elements.data_aprovacao.value = data.data_aprovacao || '';
        // form.elements.tempo_conserto.value = data.tempo_conserto || '';
        // form.elements.data_entrega.value = data.data_entrega || '';
        // if (form.elements.dias_atraso) {
        //   form.elements.dias_atraso.value = data.dias_atraso || '';
        // }
        if (form.elements.observacoes) {
            form.elements.observacoes.value = data.observacoes || '';
        }

        document.getElementById('modal-os-edit').style.display = 'flex';
    } catch (error) {
        console.error("Falha ao abrir modal de edição:", error);
        alert("Não foi possível carregar os dados para edição.");
    }
}

// Função para filtrar a tabela de componentes com base na seleção do usuário
function filtrarColunaSelect(select, columnIndex) {
    let filter = select.value;
    let table = document.querySelector('.tabela-componentes');
    if (!table) return; // Evita erro se a tabela não existir
    let tr = table.getElementsByTagName('tr');

    // Começa do índice correto para pular cabeçalhos (2 se tiver dois <tr> no <thead>)
    for (let i = 2; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName('td');
        if (td) {
            let cellValue = td[columnIndex].textContent || td[columnIndex].innerText;
            if (filter === "" || cellValue === filter) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}


// --- FUNÇÕES DE CONTROLE DOS MODAIS ---
function abrirModalOS() {
    // preenche a data de abertura com a atual
    const inputDataAbertura = document.querySelector('#form-os-add [name="data_abertura"]');
    const inputDataAprovacao = document.querySelector('#form-os-add [name="data_aprovacao"]');
    if (inputDataAbertura) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const dd = String(hoje.getDate()).padStart(2, '0');
        const dataHoje = `${yyyy}-${mm}-${dd}`;
        inputDataAbertura.value = dataHoje;
        if (inputDataAprovacao) {
            inputDataAprovacao.value = dataHoje;
        }
    }
    document.getElementById('modal-os-add').style.display = 'flex';
}
function fecharModalOS(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function filtrarColuna(input, columnIndex) {
    let filter = input.value.toUpperCase();
    let table = document.querySelector('.tabela-componentes');
    let tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName('td');
        if (td) {
            let textValue = td[columnIndex].textContent || td[columnIndex].innerText;
            if (textValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

function filtrarColunaSelect(select, columnIndex) {
    let filter = select.value;
    let table = document.querySelector('.tabela-componentes');
    if (!table) return;

    let tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) return;

    let rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        let td = rows[i].getElementsByTagName('td')[columnIndex];
        if (td) {
            let cellValue = td.textContent || td.innerText;
            rows[i].style.display = (filter === "" || cellValue === filter) ? "" : "none";
        }
    }
}

function esconderColunaValorServico() {
    if (!(window.isAdmin || window.isVendedor_repos || window.isVendedor_serv)) {
        let table = document.querySelector('.tabela-componentes');
        if (!table) return;
        let trs = table.querySelectorAll('tbody tr');
        trs.forEach(tr => {
            let tds = tr.getElementsByTagName('td');
            if (tds[6]) tds[6].style.display = 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/ordem_serv')) {
        carregarOrdemServ();
    }
});

function SomaOs() {
    const table = document.querySelector('.tabela-componentes');
    if (!table) return;
    let total = 0;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
        const status = tr.querySelector('td:nth-child(2)')?.textContent.trim(); // coluna do status
        if (status !== "Finalizada") { // ✅ soma todas que NÃO estão finalizadas
            const tdValor = tr.querySelector('td.valor-servico');
            if (tdValor) {
                const valor = tdValor.textContent
                    .replace(/[^\d,,-]/g, '')   // mantém apenas dígitos e vírgula
                    .replace('.', '')           // remove separador de milhar
                    .replace(',', '.');         // vírgula vira ponto decimal
                if (valor) total += parseFloat(valor) || 0;
            }
        }
    });

    // Atualiza o valor no HTML
    const span = document.getElementById('valor-servico-total');
    if (span) {
        span.textContent = 'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }
}
function abrirModalSGP() {
    // preenche a data de abertura com a atual
    const inputData = document.querySelector('#form-sgp-add [name="data"]');
    const inputPrevisaoEntrega = document.querySelector('#form-sgp-add [name="previsao_entrega"]');
    if (inputData) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const dd = String(hoje.getDate()).padStart(2, '0');
        const dataHoje = `${yyyy}-${mm}-${dd}`;
        inputData.value = dataHoje;
        if (inputData) {
            inputPrevisaoEntrega.value = dataHoje;
        }
    }
    document.getElementById('modal-sgp-add').style.display = 'flex';
}
function fecharModalSGP(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Restaura todos os checkboxes dentro do modal
    modal.querySelectorAll('.almox-ciente-checkbox').forEach(cb => {
        if (cb.dataset.originalChecked !== undefined) {
            cb.checked = cb.dataset.originalChecked === 'true';
        }
    });

    modal.style.display = 'none';
}
// função de deletarSGP (apenas admin pode deletar)
function deletarSGP(id) {
    if (!confirm('Tem certeza que deseja excluir esta SGP?')) return;

    fetch(`/excluir_sgp/${id}`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Erro na resposta do servidor');
    })
    .then(data => {
        if (data.success) {
            alert('SGP excluída com sucesso!');
            window.location.reload();
        } else {
            alert(data.error || 'Erro ao excluir SGP.');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao excluir SGP!');
    });
}
// torna a função global para o onclick inline
window.deletarSGP = deletarSGP;
// Função para abir o modal de edição da SGP
async function abrirModalEditarSGP(id) {
    try {
        const resp = await fetch(`/sgp/${id}`);
        if (!resp.ok) {
            alert('Erro ao buscar dados da SGP.');
            return;
        }
        const data = await resp.json();
        const form = document.getElementById('form-sgp-edit');
        if (!form) {
             console.error('Formulário de edição SGP não encontrado.');
             return;
        }
        
        // Permissões de Edição (Usa as variáveis globais definidas no HTML/login)
        const podeEditarVendedor = window.isAdmin || window.isVendedor_repos || window.isVendedor_serv;
        const podeEditarAlmox = window.isAdmin || window.isAlmoxarifado;
        const podeSalvar = podeEditarVendedor || podeEditarAlmox;

        // 1. Preenchimento de TODOS os campos
        form.elements.id.value = data.id;

        // Campos do Vendedor: ReadOnly para Almoxarifado
        const vendedorFields = ['data', 'vendedor', 'descricao', 'numero_pedido', 'cliente', 'previsao_entrega', 'observacao1'];
        vendedorFields.forEach(name => {
            const element = form.elements[name];
            if (element) {
                element.value = data[name] || '';
                // Reforça a regra de que Almoxarifado não pode editar, apesar do controle no HTML
                if (window.isAlmoxarifado && !window.isAdmin) {
                    element.readOnly = true;
                }
            }
        });

        // Campos do Almoxarifado
        const almoxFields = ['almox_ciente', 'data_separacao', 'observacao2', 'forma_entrega', 'finalizado_em', 'nota_fiscal'];
        
        // Trata Almox Ciente (checkbox)
        const almoxCienteCheckbox = form.elements.almox_ciente;
        if (almoxCienteCheckbox) {
             almoxCienteCheckbox.checked = !!data.almox_ciente;
             // O disabled é controlado pelo HTML via Jinja2 (só Admin e Almoxarifado editam)
        }

        // Trata os outros campos do Almoxarifado
        almoxFields.filter(name => name !== 'almox_ciente').forEach(name => {
            const element = form.elements[name];
            if (element) {
                element.value = data[name] || '';
                // O readonly é controlado pelo HTML via Jinja2 (só Admin e Almoxarifado editam)
            }
        });

        // 2. Torna o botão de salvar visível/habilitado para quem pode editar
        const saveButton = form.querySelector('.botao-sgp[type="submit"]');
        if (saveButton) {
            saveButton.style.display = podeSalvar ? 'block' : 'none';
            saveButton.disabled = !podeSalvar;
        }

        document.getElementById('modal-sgp-edit').style.display = 'flex';
    } catch (error) {
        console.error("Falha ao abrir modal de edição:", error);
        alert("Não foi possível carregar os dados para edição.");
    }
    // ... (restante da função onsubmit que lida com o save)
    const formSgpEdit = document.getElementById('form-sgp-edit');
    if (formSgpEdit) {
        formSgpEdit.onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(formSgpEdit);
            const data = Object.fromEntries(formData.entries());
             
            // Garante que o valor do checkbox seja enviado corretamente, mesmo se estiver disabled para outros
            if (formSgpEdit.elements.almox_ciente) {
                 data.almox_ciente = formSgpEdit.elements.almox_ciente.checked;
            } else {
                 // Se o campo não existe (oculto para vendedor_repos), o backend irá ignorá-lo
                 delete data.almox_ciente;
            }
             
            
            const resp = await fetch(`/editar-sgp/${data.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (resp.ok) {
                alert("Alterações salvas!");
                window.location.reload();
            } else {
                const msg = await resp.json();
                alert(msg.error || "Erro ao salvar alterações!");
            }
        }
    }
}


