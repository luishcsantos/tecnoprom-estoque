from peewee import *
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import date # Import date

# Caminho para o banco de dados
db_path = "database/bancoestoque.db"

# Cria o banco de dados, caso não exista
if not os.path.exists("database"):
    os.makedirs("database")

db = SqliteDatabase(db_path, timeout=30)


class BaseModel(Model):
    class Meta:
        database = db


class User(BaseModel):
    username = CharField(unique=True)
    password_hash = CharField()
    access_level = CharField()

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def access_level_description(self):
        if self.access_level == "admin":
            return "Administrador"
        elif self.access_level == "comprador":
            return "Comprador"
        elif self.access_level == "almoxarifado":
            return "Almoxarifado"
        elif self.access_level in ("vendedor_serv","vendedor_repos"):
            return "Vendedor"
        elif self.access_level == "RH":
            return "RH"
        elif self.access_level == "Comprador_gerencia":
            return "Comprador/Gerência"
        elif self.access_level == "Diretoria":
            return "Diretoria"
        else:
            return "Usuário"


# Função para criar o banco de dados e as tabelas
def create_database_and_tables():
    try:
        # Conecta ao banco de dados
        db.connect()

        # Cria as tabelas se elas não existirem
        db.create_tables([User], safe=True)
        print("✅ Banco de dados e tabelas criados com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar banco de dados e tabelas: {e}")
    finally:
        # Fecha a conexão com o banco de dados
        if not db.is_closed():
            db.close()


# Executa a função para criar o banco de dados e as tabelas
create_database_and_tables()


# Componentes
class Componentes(BaseModel):
    id = PrimaryKeyField()
    descr = CharField(unique=True)
    categ = CharField()
    encaps = CharField()
    quant = IntegerField()
    quant_min = IntegerField()
    local = CharField()
    cod_ant = CharField()
    obs = CharField()

    class Meta:
     database = db
     table_name = "componentes"


# Ttabela de categorias
class Categoria(Model):
    id_categ = AutoField()
    categ = CharField(unique=True)
    
    class Meta:
        database = db
        table_name = 'categoria'

#Tabela Encapsulamento
class Package(Model):
    id_pack = AutoField()
    pack = CharField(unique=True)
    
    class Meta:
        database = db
        table_name = 'package'


#Tabela de pedidos
class Pedidos(BaseModel):
    id = PrimaryKeyField()
    data = DateTimeField()
    componentes = CharField()
    link_componentes = CharField()
    fornecedor = CharField()
    quant = IntegerField()
    urgente = BooleanField()
    requisitante = CharField()
    motivo = CharField(null=True, default="")
    comprado = BooleanField()
    comprador = CharField()
    data_compra = DateTimeField(null=True, default=None)
    data_chegada = DateTimeField(null=True, default=None)
    status = BooleanField()
    obs = CharField(null=True, default="")

    class Meta:
        database = db
        table_name = "pedidos"

# Função para criar o banco de dados e as tabelas
def create_database_pedidos():
    try:
        # Conecta ao banco de dados
        db.connect()

        # Cria as tabelas se elas não existirem
        db.create_tables([Pedidos], safe=True)
        print("✅ Banco de dados e tabelas de pedidos criados com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar banco de dados e tabelas de pedidos: {e}")
    finally:
        # Fecha a conexão com o banco de dados
        if not db.is_closed():
            db.close()

create_database_pedidos()

#Tabela de Sgp
class Sgp(BaseModel):
    id = PrimaryKeyField()
    data = DateField(null=True)               # DATA
    vendedor = CharField(null=True)           # VENDEDOR
    descricao = TextField(null=True)          # O QUE
    numero_pedido = CharField(null=True)      # Nº DO PEDIDO
    cliente = CharField()                     # CLIENTE
    previsao_entrega = DateField(null=True)   # PREVISÃO ENTREGA
    observacao1 = TextField(null=True)        # OBSERVAÇÃO
    almox_ciente = BooleanField(default=False)# ALMOX. CIENTE
    data_separacao = DateField(null=True)     # DATA DA SEPARAÇÃO
    observacao2 = TextField(null=True)        # OBSERVAÇÃO
    forma_entrega = CharField(null=True)      # FORMA DE ENTREGA
    finalizado_em = DateField(null=True)      # FINALIZADO EM
    nota_fiscal = CharField(null=True)        # NOTA FISCAL

    class Meta:
        database = db
        table_name = "sgp"

def create_database_sgp():
    try:
        # Conecta ao banco de dados
        db.connect()

        # Cria as tabelas se elas não existirem
        db.create_tables([Sgp], safe=True)
        print("✅ Banco de dados e tabelas de SGP criados com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar banco de dados e tabelas de SGP: {e}")
    finally:
        # Fecha a conexão com o banco de dados
        if not db.is_closed():
            db.close()

create_database_sgp()

class OrdemServ(BaseModel):
    id = PrimaryKeyField()
    data_abertura = DateField(default=date.today)
    status = CharField()
    n_os = FloatField(unique=True)
    cliente = CharField()
    equipamento = TextField()
    tecnico_responsavel = CharField()
    valor_servico = FloatField(null=True)
    data_aprovacao = DateField(null=True)
    tempo_conserto = FloatField(null=True)
    data_entrega = DateField(null=True)
    dias_atraso = IntegerField(null=True)
    observacoes = TextField(null=True)

    class Meta:
        database = db
        table_name = "ordem_serv"

def create_database_ordem_serv():
    try:
        # Conecta ao banco de dados
        db.connect()

        # Cria as tabelas se elas não existirem
        db.create_tables([OrdemServ], safe=True)
        print("✅ Banco de dados e tabelas de Ordem de Serviço criados com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar banco de dados e tabelas de Ordem de Serviço: {e}")
    finally:
        # Fecha a conexão com o banco de dados
        if not db.is_closed():
            db.close()

create_database_ordem_serv()