from flask import (
    Flask,
    render_template,
    jsonify,
    request,
    redirect,
    url_for,
    session,
    flash,
    make_response,
)
from models import db, User, Componentes, Categoria, Package, Pedidos, Sgp, OrdemServ
import os
from peewee import *
from livereload import Server
import traceback
from werkzeug.utils import secure_filename
from datetime import datetime
from waitress import serve
from decimal import Decimal  # Added for Decimal conversions
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Chave secreta para sessões


@app.before_request
# Proteger rotas existentes
def require_login():
    allowed_routes = ["login", "static"]
    if request.endpoint not in allowed_routes and "user_id" not in session:
        return redirect(url_for("login"))


# Gerenciador de contexto para abrir e fechar a conexão com o banco de dados
@app.before_request
def before_request():
    db.connect()


@app.teardown_request
def teardown_request(exception):
    if not db.is_closed():
        db.close()


def create_admin_user():
    try:
        admin = User.get(User.username == "admin")
        print("Usuário admin já existe.")
    except User.DoesNotExist:
        admin = User(username="admin", access_level="admin")
        admin.set_password("admin")  # Senha padrão
        admin.save()
        print("Usuário admin criado com sucesso!")


# Executa a função create_admin_user() quando a aplicação é iniciada
with app.app_context():
    try:
        db.connect()

        # Cria tabelas apenas se não existirem
        try:
            db.create_tables([User, Componentes, Categoria, Package, Pedidos, Sgp], safe=True)
        except IntegrityError:
            print("Tabelas ja existem")

        # Força a criação do admin
        try:
            create_admin_user()
        except IntegrityError:
            print("Usuário admin já existe no banco")

    except Exception as e:
        print(f"Erro na inicialização: {str(e)}")
    finally:
        if not db.is_closed():
            db.close()


# Rota de login
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        try:
            user = User.get(User.username == username)
            if user.check_password(password):
                session["user_id"] = user.id
                session["username"] = user.username
                session["access_level"] = user.access_level
                flash("Login realizado com sucesso!", "success")
                if user.access_level == "comprador" or user.access_level == "Comprador_gerencia":
                    return redirect(url_for("listar_pedidos"))
                elif user.access_level in ('vendedor_repos','almoxarifado'):
                    return redirect(url_for("listar_sgp"))
                elif user.access_level in ('vendedor_serv'):
                    return redirect(url_for("listar_ordem_serv"))
                else:
                    return redirect(url_for("estoqueLab"))
            else:
                flash("Senha incorreta!", "danger")
        except User.DoesNotExist:
            flash("Usuário não encontrado!", "danger")
    return render_template("login.html")


# Rota de logout
@app.route("/logout")
def logout():
    session.clear()
    flash("Logout realizado com sucesso!", "success")
    return redirect(url_for("login"))

# Rota de registro (apenas para admin)
@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" not in session or session.get("access_level") != "admin":
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return "Acesso negado!", 403
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        access_level = request.form["access_level"]

        try:
            with db.atomic():
                # Verifica se o usuário já existe
                user = User.get(User.username == username)
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return "Usuário já existe!", 400
                flash("Usuário já existe!", "danger")
        except User.DoesNotExist:
            try:
                with db.atomic():
                    # Se o usuário não existe, cria um novo
                    user = User(username=username, access_level=access_level)
                    user.set_password(password)
                    user.save()
                    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                        return "", 200
                    flash("Usuário registrado com sucesso!", "success")
                    return redirect(url_for("listar_usuarios"))
            except Exception as e:
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return f"Erro ao registrar usuário: {str(e)}", 500
                flash(f"Erro ao registrar usuário: {str(e)}", "danger")
        except Exception as e:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return f"Erro ao verificar usuário: {str(e)}", 500
            flash(f"Erro ao verificar usuário: {str(e)}", "danger")

    # Para AJAX, não retorna HTML, só status
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return "", 200

    # return render_template("register.html")


@app.route("/usuarios")
def listar_usuarios():
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    # Busca todos os usuários no banco de dados
    usuarios = User.select()
    return render_template("usuarios.html", usuarios=usuarios)


@app.route("/editar_usuario/<int:user_id>", methods=["GET", "POST"])
def editar_usuario(user_id):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        usuario = User.get(User.id == user_id)
    except User.DoesNotExist:
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return "Usuário não encontrado!", 404
        flash("Usuário não encontrado!", "danger")
        return redirect(url_for("listar_usuarios"))

    if request.method == "POST":
        usuario.username = request.form["username"]
        usuario.access_level = request.form["access_level"]
        nova_senha = request.form["password"]

        if nova_senha:
            usuario.set_password(nova_senha)

        usuario.save()
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return "", 200
        flash("Usuário atualizado com sucesso!", "success")
        return redirect(url_for("listar_usuarios"))

    # return render_template("editar_usuario.html", usuario=usuario)


@app.route("/excluir_usuario/<int:user_id>", methods=["POST"])
def excluir_usuario(user_id):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        with db.atomic():  # Inicia uma transação
            usuario = User.get(User.id == user_id)

            # Verifica se o usuário é o "admin"
            if usuario.username == "admin":
                flash("O usuário admin não pode ser excluído!", "danger")
                return redirect(url_for("listar_usuarios"))
            else:
                usuario.delete_instance()
                flash("Usuário excluído com sucesso!", "success")

    except DoesNotExist:
        flash("Usuário não encontrado!", "danger")
    except Exception as e:
        flash(f"Erro ao excluir usuário: {str(e)}", "danger")

    return redirect(url_for("listar_usuarios"))

@app.route("/alterar_senha", methods=["POST"])
def alterar_senha():
    if "user_id" not in session:
        return jsonify({"error": "Acesso negado!"}), 403

    senha_atual = request.form.get("senha_atual")
    nova_senha = request.form.get("nova_senha")
    confirmar_senha = request.form.get("confirmar_senha")

    if not senha_atual or not nova_senha or not confirmar_senha:
        return jsonify({"error": "Preencha todos os campos."}), 400

    if nova_senha != confirmar_senha:
        return jsonify({"error": "As senhas não coincidem."}), 400

    try:
        user = User.get(User.id == session["user_id"])
        # Proteção: só o próprio admin pode trocar a senha dele
        if user.username == "admin" and session.get("username") != "admin":
            return jsonify({"error": "A senha do admin só pode ser alterada pelo próprio admin."}), 403

        if not user.check_password(senha_atual):
            return jsonify({"error": "Senha atual incorreta."}), 400

        user.set_password(nova_senha)
        user.save()
        return jsonify({"success": "Senha alterada com sucesso!"}), 200
    except Exception as e:
        return jsonify({"error": f"Erro ao alterar senha: {str(e)}"}), 500


@app.route("/")
def estoqueLab():
    try:
        estoque = Componentes.select().order_by(Componentes.descr)
        categorias = Categoria.select().order_by(Categoria.categ)
        encapsulamento = Package.select().order_by(Package.pack)
        return render_template(
            "index.html",
            estoque=estoque,
            categorias=categorias,
            encapsulamento=encapsulamento,
        )
    except Exception as e:
        print(f"Erro ao carregar a página inicial: {e}")
        return "Erro ao carregar a página inicial", 500


# Adicione o header anti-cache
@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# Rota para listar componentes
@app.route("/componentes_select")
def listar_estoque():
    try:
        estoque = Componentes.select().order_by(Componentes.descr)
    except Exception as e:
        flash(f"Erro ao carregar componentes: {str(e)}", "danger")
        Componentes = []
    estoque = Componentes.select()
    return render_template("componentes_select.html", estoque=estoque)


# Rota para Filtrar componentes
@app.route("/filtrar_componentes")
def filtrar_componentes():
    descricao = request.args.get("descricao", "").strip()
    categoria_id = request.args.get("categoria")
    encapsulamento_id = request.args.get("encapsulamento")

    if (
        (not categoria_id or categoria_id == "")
        and (not encapsulamento_id or encapsulamento_id == "")
        and descricao == ""
    ):
        return jsonify([])

    query = Componentes.select()

    try:
        if categoria_id and categoria_id != "":
            categoria_id = int(categoria_id)
            categ = Categoria.get(Categoria.id_categ == categoria_id)
            query = query.where(Componentes.categ == categ.categ)
        if encapsulamento_id and encapsulamento_id != "":
            encapsulamento_id = int(encapsulamento_id)
            encaps = Package.get(Package.id_pack == encapsulamento_id)
            query = query.where(
                Componentes.encaps == encaps.pack
            )  # Compara Componentes.encaps com o NOME do encapsulamento
        if descricao:
            query = query.where(Componentes.descr ** f"%{descricao}%")  # icontains
    except (ValueError, Categoria.DoesNotExist, Package.DoesNotExist) as e:
        return jsonify({"error": "Parâmetro inválido ou registro não encontrado"}), 400

    componentes = [
        {
            "id": c.id,
            "descr": c.descr,
            "categ": c.categ,
            "encaps": c.encaps,
            "quant": c.quant,
            "quant_min": c.quant_min,
            "local": c.local,
            "cod_ant": c.cod_ant,
            "obs": c.obs,
        }
        for c in query
    ]
    return jsonify(componentes)


# Rota para colocar os componentes na tela de cadastro
@app.route("/componente/<int:id_comp>")
def componente(id_comp):
    comp = Componentes.get_or_none(Componentes.id == id_comp)
    if not comp:
        return jsonify(error="Não encontrado"), 404

    try:
        cat = Categoria.get(Categoria.categ == comp.categ)
        pack = Package.get(Package.pack == comp.encaps)
        id_categ = cat.id_categ
        id_pack  = pack.id_pack
    except:
        id_categ = id_pack = None

    return jsonify({
      "id":       comp.id,
      "descr":    comp.descr,
      "categ":    comp.categ,
      "pack":     comp.encaps,
      "id_categ": id_categ,
      "id_pack":  id_pack,
      "local":    comp.local,
      "obs":      comp.obs
    })

# Rota para Adicionar componentes
@app.route("/adicionar-componente", methods=["POST"])
def adicionar_componente():
    print("Rota /adicionar-componente chamada")
    if session.get("access_level") != "admin":
        return jsonify({"error": "Acesso negado"}), 403

    dados = request.json or {}
    if (
        not dados.get("descricao")
        or not dados.get("categoria")
        or not dados.get("encapsulamento")
    ):
        return jsonify({"error": "Campos obrigatórios não preenchidos"}), 400

    try:
        categoria = Categoria.get(Categoria.id_categ == dados["categoria"])
        encaps    = Package.get(Package.id_pack  == dados["encapsulamento"])

        # → Verifica se já existe um componente igual
        existente = Componentes.get_or_none(
            (Componentes.descr   == dados["descricao"]) &
            (Componentes.categ   == categoria.categ) &
            (Componentes.encaps  == encaps.pack)
        )
        if existente:
            return jsonify({"error": "Componente já cadastrado"}), 409

        Componentes.create(
            cod_ant      = dados.get("codigoAntigo", ""),
            descr        = dados["descricao"],
            categ        = categoria.categ,
            encaps       = encaps.pack,
            local        = dados.get("local", ""),
            quant        = int(dados.get("quantidade", 0)),
            quant_min    = int(dados.get("quantidadeMinima", 0)),
            obs          = dados.get("observacoes", ""),
        )
        return jsonify({"message": "Componente adicionado com sucesso!"}, 200)

    except Categoria.DoesNotExist:
        return jsonify({"error": "Categoria não encontrada"}), 400
    except Package.DoesNotExist:
        return jsonify({"error": "Encapsulamento não encontrado"}), 400
    except IntegrityError:
        # Trata falha de UNIQUE constraint de forma amigável
        return jsonify({"error": "Componente já cadastrado"}), 409
    except Exception as e:
        print("Erro ao salvar componente:", e)
        return jsonify({"error": str(e)}), 500


# Rota para Editar componentes
@app.route("/editar/<int:id_comp>", methods=["GET", "POST"])
def editar_componente(id_comp):
    if "user_id" not in session:
        return jsonify({"error": "Acesso negado!"}), 403

    try:
        componente = Componentes.get(Componentes.id == id_comp)
    except Componentes.DoesNotExist:
        return jsonify({"error": "Componente não encontrado!"}), 404

    if request.method == "POST":
        try:
            dados = request.form
            print(f"Dados recebidos no backend: {dados}")  # Debug

            # Atualização dos campos básicos
            if "descr" in dados:
                componente.descr = dados["descr"]
            if "quant" in dados:
                componente.quant = int(dados["quant"])
            if "quant_min" in dados:
                componente.quant_min = int(dados["quant_min"])
            if "local" in dados:
                componente.local = dados["local"]
            if "cod_ant" in dados:
                componente.cod_ant = dados["cod_ant"]
            if "obs" in dados:
                componente.obs = dados["obs"]

            # Atualiza categoria se enviada
            if "categ" in dados:
                try:
                    categoria = Categoria.get(Categoria.id_categ == int(dados["categ"]))
                    componente.categ = categoria.categ
                except Categoria.DoesNotExist:
                    return jsonify({"error": "Categoria não encontrada"}), 400

            # Atualiza encapsulamento se enviado
            if "encaps" in dados:
                try:
                    encaps = Package.get(Package.id_pack == int(dados["encaps"]))
                    componente.encaps = encaps.pack
                except Package.DoesNotExist:
                    return jsonify({"error": "Encapsulamento não encontrado"}), 400

            componente.save()
            return jsonify(
                {"success": True, "message": "Componente atualizado com sucesso!"}
            )

        except ValueError as e:
            return jsonify({"error": f"Erro de conversão: {str(e)}"}), 400
        except Exception as e:
            print(f"Erro ao atualizar: {str(e)}")  # Debug
            return jsonify({"error": f"Erro ao atualizar: {str(e)}"}), 500

    return jsonify({"error": "Método não permitido"}), 405


# FIM da rota editar_componente


# Rota para deletar componentes
@app.route("/deletar_componente/<int:id_comp>", methods=["POST"])
def deletar_componente_rota(id_comp):
    if "user_id" not in session:
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"error": "Acesso negado!"}), 403
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        with db.atomic():
            componente = Componentes.get(Componentes.id == id_comp)
            print(f"Componente encontrado: {componente.descr}")  # Log para depuração
            componente.delete_instance()
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"success": "Componente excluído com sucesso!"}), 200
            flash("Componente excluído com sucesso!", "success")
    except Componentes.DoesNotExist:
        print(f"Componente com ID {id_comp} não encontrado.")  # Log para depuração
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"error": "Componente não encontrado!"}), 404
        flash("Componente não encontrado!", "danger")
    except IntegrityError as e:
        print(f"Erro de integridade ao excluir componente: {e}")  # Log detalhado
        flash(
            "Não é possível excluir o componente devido a dependências no banco de dados.",
            "danger",
        )
    except Exception as e:
        print(
            f"Erro ao excluir componente: {traceback.format_exc()}"
        )  # Log completo do erro
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"error": f"Erro ao excluir componente: {str(e)}"}), 500
        flash(f"Erro ao excluir componente: {str(e)}", "danger")

    return redirect(url_for("estoqueLab"))


# FIM da rota deletar_componente

# Rota para salvar imagens

@app.route("/obter-componente/<int:id_comp>")
def obter_componente(id_comp):
    comp = Componentes.get_or_none(Componentes.id == id_comp)
    if not comp:
        return jsonify(error="Não encontrado"), 404
    return jsonify(
        {
            "id": comp.id,
            "descr": comp.descr,
            "id_categ": comp.categ.id_categ,
            "id_pack": comp.pack.id_pack,
            "local": comp.local,
            "obs": comp.obs,
        }
    )

# Rota para Categorias ---------------------------------------------------------------
@app.route("/categorias", methods=["GET", "POST"])
def listar_categorias():
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))
    
    error = None

    if request.method == "POST":
        try:
            nova_categoria = request.form["categoria"].strip()
            if nova_categoria:
                Categoria.create(categ=nova_categoria)
                flash("Categoria adicionada com sucesso!", "success")
                return redirect(url_for("listar_categorias"))
        except IntegrityError:
            error = "Esta categoria já existe!"
        except Exception as e:
            error = f"Erro ao adicionar categoria: {str(e)}"

    try:
        categorias = Categoria.select().order_by(Categoria.id_categ)
    except Exception as e:
        error = f"Erro ao carregar categorias: {str(e)}"
        categorias = []

    return render_template("categorias.html", categorias=categorias, error=error)


@app.route("/editar_categoria/<int:id_categ>", methods=["GET", "POST"])
def editar_categoria(id_categ):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        categoria = Categoria.get(Categoria.id_categ == id_categ)
    except Categoria.DoesNotExist:
        flash("Categoria não encontrada!", "danger")
        return redirect(url_for("listar_categorias"))

    if request.method == "POST":
        nova_categoria = request.form["categoria"].strip()
        if nova_categoria:
            categoria.categ = nova_categoria
            categoria.save()
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return "", 200
            flash("Categoria atualizada com sucesso!", "success")
            return redirect(url_for("listar_categorias"))
        else:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return "O nome da categoria não pode ser vazio.", 400
            flash("O nome da categoria não pode ser vazio.", "danger")

    return redirect(url_for("listar_categorias"))

@app.route("/excluir_categoria/<int:id_categ>", methods=["POST"])
def excluir_categ(id_categ):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        with db.atomic():  # Inicia uma transação
            categoria = Categoria.get(Categoria.id_categ == id_categ)
            categoria.delete_instance()
            flash("Categoria excluída com sucesso!", "success")

    except Categoria.DoesNotExist:
        flash("Categoria não encontrada!", "danger")
    except Exception as e:
        flash(f"Erro ao excluir categoria: {str(e)}", "danger")

    return redirect(url_for("listar_categorias"))


# FIM Rota para Categorias ---------------------------------------------------------------


# Rota para  Encapsulamento--------------------------------------------------------------
@app.route("/encapsulamento", methods=["GET", "POST"])
def listar_encapasulamento():
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))
    
    error = None

    if request.method == "POST":
        try:
            novo_encapsulamento = request.form["package"].strip()
            if novo_encapsulamento:
                Package.create(pack=novo_encapsulamento)
                flash("Encapsulamento adicionado com sucesso!", "success")
                return redirect(url_for("listar_encapasulamento"))
        except IntegrityError:
            error = "Este encapsulamento já existe!"
        except Exception as e:
            error = f"Erro ao adicionar encapsulamento: {str(e)}"

    try:
        encapsulamento = Package.select().order_by(Package.id_pack)
    except Exception as e:
        error = f"Erro ao carregar encapsulamento: {str(e)}"
        encapsulamento = []

    return render_template(
        "encapsulamento.html", encapsulamento=encapsulamento, error=error
    )


@app.route("/editar_encapsulamento/<int:id_pack>", methods=["GET", "POST"])
def editar_encapsulamento(id_pack):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        encapsulamento = Package.get(Package.id_pack == id_pack)
    except Package.DoesNotExist:
        flash("Encapsulamento não encontrado!", "danger")
        return redirect(url_for("listar_encapasulamento"))

    if request.method == "POST":
        novo_encapsulamento = request.form["package"].strip()
        if novo_encapsulamento:
            encapsulamento.pack = novo_encapsulamento
            encapsulamento.save()
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return "", 200
            flash("Encapsulamento atualizado com sucesso!", "success")
            return redirect(url_for("listar_encapasulamento"))
        else:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return "", 200
            flash("O nome do encapsulamento não pode ser vazio.", "danger")


@app.route("/excluir_encapsulamento/<int:id_pack>", methods=["POST"])
def excluir_encapsulamento(id_pack):
    if "user_id" not in session or session.get("access_level") != "admin":
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    try:
        with db.atomic():
            encapsulamento = Package.get(Package.id_pack == id_pack)
            encapsulamento.delete_instance()
            flash("Encapsulamento excluído com sucesso!", "success")

    except Package.DoesNotExist:
        flash("Encapsulamento não encontrado!", "danger")
    except Exception as e:
        flash(f"Erro ao excluir encapsulamento: {str(e)}", "danger")

    return redirect(url_for("listar_encapasulamento"))


# FIM Rota para Encapsulamento--------------------------------------------------------------


# Rota para Pedidos--------------------------------------------------------------
@app.route("/pedidos", methods=["GET", "POST"])
def listar_pedidos():

    error = None
    usuarios = User.select().order_by(User.username)

    if request.method == "POST":
        try:
            novo_pedido = request.form["pedido"].strip()
            if novo_pedido:
                Pedidos.create(pack=novo_pedido)
                flash("Pedido adicionado com sucesso!", "success")
        except IntegrityError:
            error = "Este Pedido já existe!"
        except Exception as e:
            error = f"Erro ao adicionar encapsulamento: {str(e)}"

    try:
        pedido = Pedidos.select().order_by(Pedidos.id)
    except Exception as e:
        error = f"Erro ao carregar Pedidos: {str(e)}"
        pedido = []

    return render_template(
        "pedidos.html", pedido=pedido, error=error, usuarios=usuarios
    )

@app.route("/adicionar-pedido", methods=["POST"])
def adicionar_pedido_api():
    dados = request.json or {}
    comp   = dados.get("componente", "").strip()
    link   = dados.get("link", "").strip()
    forn   = dados.get("fornecedor", "").strip()
    quant  = int(dados.get("quantidade", 0))
    urg    = bool(dados.get("urgente"))
    motivo = dados.get("motivo", "").strip()
    requisitante = session.get("username", "") 

    try:
        Pedidos.create(
            data               = datetime.now(),
            componentes        = comp,
            fornecedor         = forn,
            quant              = quant,
            urgente            = urg,
            requisitante       = requisitante,
            motivo             = motivo,
            link_componentes   = link,
            comprado           = False,
            comprador          = "",
            data_compra        = None,
            data_chegada       = None,
            status             = False,
        )
        return jsonify(message="Pedido adicionado com sucesso!"), 200

    except IntegrityError:
        return jsonify(error="Este pedido já existe!"), 409
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/pedidos")
def api_listar_pedidos():
    # Adiciona a lógica de filtragem
    comprado_filter = request.args.get('comprado')
    status_filter = request.args.get('status')
    requisitante_filter = request.args.get('requisitante')
    componente_search = request.args.get('componente_search')
    
    query = Pedidos.select().order_by(Pedidos.id.desc())
    data = request.args.get("data")
    

    if data:
        try: 
            data_dt = datetime.strptime(data, "%Y-%m-%d").date()
            query = query.where(fn.DATE(Pedidos.data) == data_dt)
        except Exception as e:
            pass

        

    if comprado_filter:
        query = query.where(Pedidos.comprado == (comprado_filter == 'true' or comprado_filter == 'Sim'))
    
    if status_filter:
        query = query.where(Pedidos.status == (status_filter == 'true' or status_filter == 'Sim'))
        
    if requisitante_filter:
        query = query.where(Pedidos.requisitante == requisitante_filter)

    if componente_search:
        query = query.where(Pedidos.componentes ** f"%{componente_search}%")
        
    pedidos = query

    lista = []
    for p in pedidos:
        lista.append({
            "id": p.id,
            "data": p.data.strftime("%d/%m/%Y %H:%M"),
            "componentes": p.componentes,
            "link_componentes": p.link_componentes,
            "fornecedor": p.fornecedor,
            "quant": p.quant,
            "urgente": p.urgente,
            "requisitante": p.requisitante,
            "motivo": p.motivo,
            "obs": p.obs,
            "comprado": p.comprado,
            "comprador": p.comprador,
            "data_compra": p.data_compra.strftime("%d/%m/%Y") if p.data_compra else "",
            "data_chegada": p.data_chegada.strftime("%d/%m/%Y") if p.data_chegada else "",
            "status": p.status,
        })
    return jsonify(lista)

@app.route("/editar_pedido/<int:id>", methods=["POST"])
def editar_pedido(id):
    try:
        dados = request.get_json() or {}
        pedido = Pedidos.get(Pedidos.id == id)
        pedido.comprado = dados.get("comprado", True)
        pedido.comprador = session.get("username", "")
        pedido.data_compra = datetime.now()
        data_chegada = dados.get("data_chegada")
        
        if data_chegada:
            pedido.data_chegada = datetime.strptime(data_chegada, "%Y-%m-%d")

    
        if 'fornecedor' in dados:
            pedido.fornecedor = dados['fornecedor']
        
        if 'obs' in dados:
            pedido.obs = dados['obs']

        pedido.save()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(error=str(e)), 500
    
@app.route('/atualizar_status/<int:id>', methods=['POST'])
def atualizar_status(id):
    try:
        dados_status = request.get_json() or {}
        pedido = Pedidos.get(Pedidos.id == id)
        pedido.status = dados_status.get("status")
        print("Status atualizado:", pedido.status)
        pedido.save()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(error=str(e)), 500
    
@app.route("/excluir_pedido/<int:id>", methods=["POST"])
def excluir_pedido(id):
    try:
        pedido = Pedidos.get(Pedidos.id == id)
        pedido.delete_instance()
        return jsonify(success=True)
    except Exception as e:
        return jsonify(error=str(e)), 500
    

@app.route("/ordem_serv", methods=["GET", "POST"])
def listar_ordem_serv():
    error = None

    try:
        ordem_serv_records = OrdemServ.select().order_by(OrdemServ.id)
        # Gera lista de técnicos presentes nos registros exibidos
        tecnicos_lista = sorted({os.tecnico_responsavel for os in ordem_serv_records if os.tecnico_responsavel})
    except Exception as e:
        error = f"Erro ao carregar Ordem de Serviço: {str(e)}"
        ordem_serv_records = []
        tecnicos_lista = []

    return render_template(
        "ordem_serv.html",
        ordem_serv=ordem_serv_records,
        error=error,
        tecnicos=tecnicos_lista
    )

@app.route("/excluir_os/<int:id>", methods=["POST"])
def excluir_os(id):
    if session.get("access_level") != "admin":
        return jsonify({"error": "Acesso negado!"}), 403
    try:
        os = OrdemServ.get(OrdemServ.id == id)
        os.delete_instance()
        return jsonify(success=True)
    except OrdemServ.DoesNotExist:
        return jsonify({"error": "OS não encontrada!"}), 404
    except Exception as e:
        return jsonify(error=str(e)), 500
    
# Rota para SGP--------------------------------------------------------------
@app.route("/sgp", methods=["GET", "POST"])
def listar_sgp():    
    # Níveis de acesso permitidos
    allowed_levels = ["admin", "vendedor_repos", "vendedor_serv", "almoxarifado", "Comprador_gerencia", "diretoria"]
    
    # Adiciona a verificação de acesso
    if session.get("access_level") not in allowed_levels:
        flash("Acesso negado!", "danger")
        return redirect(url_for("estoqueLab"))

    error = None

    if request.method == "POST":
        try:
            # ... (código de adição de SGP)
            novo_sgp = request.form["sgp"].strip()
            if novo_sgp:
                Sgp.create(pack=novo_sgp)
                flash("SGP adicionado com sucesso!", "success")
        except IntegrityError:
            error = "Este SGP já existe!"
        except Exception as e:
            error = f"Erro ao adicionar SGP: {str(e)}"

    try:
        # Ordena pela data, do mais recente para o mais antigo (DESC)
        sgp_records = Sgp.select().order_by(Sgp.data.desc(), Sgp.id.desc())
        
    except Exception as e:
        error = f"Erro ao carregar SGP: {str(e)}"
        sgp_records = []

    # Captura a data de hoje para comparação no frontend
    today = datetime.now().date() 

    return render_template(
        "sgp.html", sgp=sgp_records, error=error, today=today
    )

@app.route("/adicionar-sgp", methods=["POST"])
def adicionar_sgp_api():
    # MODIFICADO: Adiciona verificação de nível de acesso
    if session.get("access_level") not in ["admin", "vendedor_repos", "vendedor_serv", "Comprador_gerencia"]:
        return jsonify({"error": "Acesso negado!"}), 403
    
    dados = request.json or {}

    def parse_date(date_str):
        return datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else None

    try:
        Sgp.create(
            data=parse_date(dados.get("data")),
            vendedor=dados.get("vendedor"),
            descricao=dados.get("descricao"),
            numero_pedido=dados.get("numero_pedido"),
            cliente=dados.get("cliente"),
            previsao_entrega=parse_date(dados.get("previsao_entrega")),
            observacao1=dados.get("observacao1"),
            almox_cliente=dados.get("almox_cliente"),
            data_separacao=parse_date(dados.get("data_separacao")),
            observacao2=dados.get("observacao2"),
            forma_entrega=dados.get("forma_entrega"),
            finalizado_em=parse_date(dados.get("finalizado_em")),
            nota_fiscal=dados.get("nota_fiscal")
        )
        return jsonify(message="SGP adicionada com sucesso!"), 200
    except IntegrityError:
        return jsonify(error="Este SGP já existe!"), 409
    except Exception as e:
        traceback.print_exc()
        return jsonify(error=str(e)), 500

@app.route("/sgp/<int:id>")
def get_sgp(id):
    try:
        sgp_record = Sgp.get(Sgp.id == id)
        return jsonify({
            "id": sgp_record.id,
            "data": sgp_record.data.isoformat() if sgp_record.data else None,
            "vendedor": sgp_record.vendedor,
            "descricao": sgp_record.descricao,
            "numero_pedido": sgp_record.numero_pedido,
            "cliente": sgp_record.cliente,
            "previsao_entrega": sgp_record.previsao_entrega.isoformat() if sgp_record.previsao_entrega else None,
            "observacao1": sgp_record.observacao1,
            "almox_ciente": sgp_record.almox_ciente,
            "data_separacao": sgp_record.data_separacao.isoformat() if sgp_record.data_separacao else None,
            "observacao2": sgp_record.observacao2,
            "forma_entrega": sgp_record.forma_entrega,
            "finalizado_em": sgp_record.finalizado_em.isoformat() if sgp_record.finalizado_em else None,
            "nota_fiscal": sgp_record.nota_fiscal,
        })
    except Sgp.DoesNotExist:
        return jsonify({"error": "SGP não encontrada"}), 404

@app.route("/editar-sgp/<int:id>", methods=["POST"])
def editar_sgp_api(id):
    # Níveis permitidos para ACESSAR A ROTA e SALVAR algo
    allowed_access = ["admin", "almoxarifado", "vendedor_repos", "vendedor_serv", "Comprador_gerencia"] 
    if session.get("access_level") not in allowed_access:
        return jsonify({"error": "Acesso negado!"}), 403

    user_level = session.get("access_level")
    is_admin = user_level == "admin"
    is_vendedor_repos = user_level == "vendedor_repos" or user_level == "Comprador_gerencia"
    is_almoxarifado = user_level == "almoxarifado"

    can_edit_vendedor = is_admin or is_vendedor_repos
    can_edit_almox = is_admin or is_almoxarifado

    try:
        sgp_record = Sgp.get(Sgp.id == id)
        dados = request.json or {}

        def parse_date(date_str):
            # O frontend deve enviar datas em formato ISO (YYYY-MM-DD) ou None
            return datetime.strptime(date_str, "%Y-%m-%d").date() if date_str and date_str.strip() else None

        # 1. ATUALIZAÇÃO DOS CAMPOS DO VENDEDOR (Permitido para admin e vendedor_repos)
        if can_edit_vendedor:
            if "data" in dados: 
                sgp_record.data = parse_date(dados.get("data"))
            if "vendedor" in dados: 
                sgp_record.vendedor = dados.get("vendedor")
            if "descricao" in dados: 
                sgp_record.descricao = dados.get("descricao")
            if "numero_pedido" in dados: 
                sgp_record.numero_pedido = dados.get("numero_pedido")
            if "cliente" in dados: 
                sgp_record.cliente = dados.get("cliente")
            if "previsao_entrega" in dados: 
                sgp_record.previsao_entrega = parse_date(dados.get("previsao_entrega"))
            if "observacao1" in dados: 
                sgp_record.observacao1 = dados.get("observacao1")

        # 2. ATUALIZAÇÃO DOS CAMPOS DO ALMOXARIFADO (Permitido para admin e almoxarifado)
        if can_edit_almox:
            # almox_ciente é um booleano
            if "almox_ciente" in dados:
                almox_ciente = dados.get("almox_ciente")
                sgp_record.almox_ciente = bool(almox_ciente) if not isinstance(almox_ciente, bool) else almox_ciente
            # A partir daqui, são campos de texto/data
            if "data_separacao" in dados:
                sgp_record.data_separacao = parse_date(dados.get("data_separacao"))
            if "observacao2" in dados:
                sgp_record.observacao2 = dados.get("observacao2", "")
            if "forma_entrega" in dados:
                sgp_record.forma_entrega = dados.get("forma_entrega", "")
            if "finalizado_em" in dados:
                sgp_record.finalizado_em = parse_date(dados.get("finalizado_em"))
            if "nota_fiscal" in dados:
                sgp_record.nota_fiscal = dados.get("nota_fiscal", "")

        sgp_record.save()
        return jsonify(message="SGP atualizada com sucesso!"), 200
        
    except Sgp.DoesNotExist:
        return jsonify({"error": "SGP não encontrada"}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify(error=str(e)), 500
    
@app.route("/excluir_sgp/<int:id>", methods=["POST"])
def excluir_sgp(id):
    if session.get("access_level") != "admin":
        return jsonify({"error": "Acesso negado!"}), 403
    try:
        sgp = Sgp.get(Sgp.id == id)
        sgp.delete_instance()
        return jsonify(success=True)
    except Sgp.DoesNotExist:
        return jsonify({"error": "SGP não encontrado!"}), 404
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route("/api/sgp")
def api_sgp():
    try:
        s = Sgp.get_by_id(id)  # busca pelo ID
        sgp_data = {
            "id": s.id,
            "almox_ciente": s.almox_ciente,
            "data_separacao": s.data_separacao.strftime('%d/%m/%Y') if s.data_separacao else '',
            "observacao2": s.observacao2,
            "forma_entrega": s.forma_entrega,
            "finalizado_em": s.finalizado_em.strftime('%d/%m/%Y') if s.finalizado_em else '',
            "nota_fiscal": s.nota_fiscal,
        }
        return jsonify(sgp_data)
    except Sgp.DoesNotExist:
        return jsonify({"error": "SGP não encontrada"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/adicionar-os", methods=["POST"])
def adicionar_os():
    # if session.get("access_level") not in ["admin", "vendedor_servico"]:
    #     return jsonify({"error": "Acesso negado!"}), 403

    dados = request.get_json() or {}

    def parse_date(date_str):
        return datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else None

    try:
        OrdemServ.create(
            data_abertura=parse_date(dados.get("data_abertura")),
            status=dados.get("status"),
            n_os=dados.get("n_os"),
            cliente=dados.get("cliente"),
            equipamento=dados.get("equipamento"),
            tecnico_responsavel=dados.get("tecnico_responsavel"),
            valor_servico=dados.get("valor_servico"),
            data_aprovacao=parse_date(dados.get("data_aprovacao")),
            tempo_conserto=dados.get("tempo_conserto"),
            data_entrega=parse_date(dados.get("data_entrega")),
            dias_atraso=dados.get("dias_atraso"),
            observacoes=dados.get("observacoes")
        )
        return jsonify(message="OS adicionada com sucesso!"), 200
    except Exception as e:
        return jsonify(error=str(e)), 400

@app.route("/api/ordem_serv")
def api_ordem_serv():
    try:
        ordens = OrdemServ.select().order_by(OrdemServ.id.desc())
        lista = []
        for os in ordens:
            lista.append({
                "id": os.id,
                "data_abertura": os.data_abertura.strftime("%Y-%m-%d") if os.data_abertura else "",
                "status": os.status,
                "n_os": os.n_os,
                "cliente": os.cliente,
                "equipamento": os.equipamento,
                "tecnico_responsavel": os.tecnico_responsavel,
                "valor_servico": os.valor_servico,
                "data_aprovacao": os.data_aprovacao.strftime("%Y-%m-%d") if os.data_aprovacao else "",
                "tempo_conserto": os.tempo_conserto,
                "data_entrega": os.data_entrega.strftime("%Y-%m-%d") if os.data_entrega else "",
                "dias_atraso": os.dias_atraso,
                "observacoes": os.observacoes
            })
        return jsonify(lista)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/os/<int:id>")
def get_os(id):
    try:
        os_record = OrdemServ.get(OrdemServ.id == id)
        return jsonify({
            "id": os_record.id,
            "data_abertura": os_record.data_abertura.isoformat() if os_record.data_abertura else None,
            "status": os_record.status,
            "n_os": os_record.n_os,
            "cliente": os_record.cliente,
            "equipamento": os_record.equipamento,
            "tecnico_responsavel": os_record.tecnico_responsavel,
            "valor_servico": os_record.valor_servico,
            "data_aprovacao": os_record.data_aprovacao.isoformat() if os_record.data_aprovacao else None,
            "tempo_conserto": os_record.tempo_conserto,
            "data_entrega": os_record.data_entrega.isoformat() if os_record.data_entrega else None,
            "dias_atraso": os_record.dias_atraso,
            "observacoes": os_record.observacoes
        })
    except OrdemServ.DoesNotExist:
        return jsonify({"error": "OS não encontrada"}), 404

@app.route("/editar-os/<int:id>", methods=["POST"])
def editar_os(id):
    try:
        os_record = OrdemServ.get(OrdemServ.id == id)
        dados = request.get_json() or {}

        def parse_date(date_str):
            return datetime.strptime(date_str, "%Y-%m-%d").date() if date_str and date_str.strip() else None

        user_level = session.get("access_level")
        can_edit_restricted = user_level in ["admin", "vendedor_repos", "vendedor_serv", "Comprador_gerencia"]

        # Campos editáveis por todos
        if "status" in dados:
            os_record.status = dados.get("status")
        if "tecnico_responsavel" in dados:
            os_record.tecnico_responsavel = dados.get("tecnico_responsavel")
        if "observacoes" in dados:
            os_record.observacoes = dados.get("observacoes")

        # Campos RESTRITOS: Só são atualizados se o usuário for autorizado
        if can_edit_restricted:
            if "data_abertura" in dados:
                os_record.data_abertura = parse_date(dados.get("data_abertura"))
            if "n_os" in dados:
                os_record.n_os = dados.get("n_os")
            if "cliente" in dados:
                os_record.cliente = dados.get("cliente")
            if "equipamento" in dados:
                os_record.equipamento = dados.get("equipamento")
            if "data_aprovacao" in dados:
                os_record.data_aprovacao = parse_date(dados.get("data_aprovacao"))
            if "tempo_conserto" in dados:
                os_record.tempo_conserto = dados.get("tempo_conserto")
            if "data_entrega" in dados:
                os_record.data_entrega = parse_date(dados.get("data_entrega"))
            if "dias_atraso" in dados:
                os_record.dias_atraso = dados.get("dias_atraso")

            # Valor Serviço: Tratamento especial para float
            if "valor_servico" in dados:
                val_servico = dados.get("valor_servico")
                if val_servico in ('', None):
                    os_record.valor_servico = None
                else:
                    try:
                        os_record.valor_servico = float(val_servico)
                    except ValueError:
                        os_record.valor_servico = None
        
        os_record.save()
        return jsonify(message="OS atualizada com sucesso!"), 200
    except OrdemServ.DoesNotExist:
        return jsonify({"error": "OS não encontrada"}), 404
    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == "__main__":
    # # Configuração do servidor de desenvolvimento com livereload
    # server = Server(app.wsgi_app)

    # # # Configuração correta para monitoramento
    # server.watch("templates/**/*.html")  # Padrão glob
    # server.watch("static/**/*")  # Todas extensões

    # # Configurações de desenvolvimento
    # app.config["TEMPLATES_AUTO_RELOAD"] = True

    # server.serve(host="0.0.0.0", port=80, debug=True, restart_delay=1)

    print("Iniciando servidor de produção Waitress na porta 80...")
    serve(app, host="0.0.0.0", port=80)