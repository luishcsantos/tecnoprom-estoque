Para fazer o APP.exe

com console

pyinstaller `
  --onedir `
  --name "Lab" `
  --add-data "templates;templates" `
  --add-data "static;static" `
  --add-data "database\\bancoestoque.db;database" `
  --paths "estoque\\Lib\\site-packages" `
  index.py


sem console

pyinstaller `
  --onedir `
  --windowed `
  --name "Lab" `
  --add-data "templates;templates" `
  --add-data "static;static" `
  --add-data "database\\bancoestoque.db;database" `
  --paths "estoque\\Lib\\site-packages" `
  index.py


depois colamos o database atualizado na pasta database

caso queira colocar todas as templentes em um file para não dar acesso aos arquivos

pyinstaller `
  --onefile `
  --name "Lab" `
  --add-data "templates;templates" `
  --add-data "static;static" `
  --paths "estoque\\Lib\\site-packages" `
  index.py

ou sem o console:

pyinstaller `
  --onefile `
  --windowed `
  --name "Lab" `
  --add-data "templates;templates" `
  --add-data "static;static" `
  --paths "estoque\\Lib\\site-packages" `
  index.py

E colamos o banco na mesma pasta

