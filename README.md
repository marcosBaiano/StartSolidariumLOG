# Sistema de Logística de Coleta de Resíduos

Este projeto mostra um sistema simples de logística para cadastro, listagem e atualização de status de coletas.

## Estrutura dos Arquivos

- `index.html`: estrutura HTML da interface
- `styles.css`: estilos CSS para a interface
- `app.js`: lógica JavaScript do front-end
- `server.js`: back-end em Node.js
- `coletas.json`: armazenamento de dados das coletas
- `db.sql`: exemplo de estrutura de banco de dados SQL
- `README.md`: documentação do projeto

## Como rodar o back-end

1. Abra o terminal na pasta deste projeto.
2. Execute:

```bash
node server.js
```

3. Abra no navegador:

```text
http://localhost:3000
```

## API disponível

- `GET /api/coletas` → lista todas as coletas.
- `POST /api/coletas` → cadastra nova coleta.
- `PATCH /api/coletas/:id/status` → altera o status de uma coleta.
- `GET /api/rotas` → calcula dados simples de rota e eficiência.

### Exemplo de corpo para cadastrar

```json
{
  "nome": "João Silva",
  "endereco": "Rua A, 123",
  "tipo": "Plástico",
  "data": "2026-05-10"
}
```

### Exemplo de corpo para atualizar status

```json
{
  "status": "Em Rota"
}
```

## Como conectar o front-end com o back-end

O front-end usa `fetch()` para enviar e receber dados JSON do back-end.

- `GET /api/coletas` para carregar a lista.
- `POST /api/coletas` para cadastrar.
- `PATCH /api/coletas/:id/status` para atualizar o status.

## Conectar com banco de dados

Para um sistema real, você pode usar um banco como SQLite, MySQL ou PostgreSQL.

- `db.sql` mostra as tabelas básicas.
- A tabela `clientes` guarda informações do cliente.
- A tabela `coletas` guarda cada coleta.
- A tabela `rotas` guarda dados da rota e tempo.

O back-end lê e grava no banco de dados usando uma conexão SQL. No projeto atual, usamos o arquivo `coletas.json` para simplificar.

## Estrutura sugerida do sistema

1. Cadastro de coleta
2. Armazenamento das coletas no banco
3. Cálculo de rota simples
4. Atualização de status
5. Relatórios de eficiência

## Checklist de testes simples

- [ ] Cadastrar nova coleta
- [ ] Listar coletas existentes
- [ ] Atualizar status para `Em Rota`
- [ ] Atualizar status para `Concluído`
- [ ] Verificar mensagens de sucesso
- [ ] Verificar erros quando faltar campo
- [ ] Verificar a listagem e o dashboard atualizando

## Como testar manualmente

1. Rode `node server.js`.
2. Abra `http://localhost:3000`.
3. Preencha o formulário e envie.
4. Veja se a coleta aparece na lista.
5. Clique nos botões de status.
6. Verifique se o `Total de Coletas` e os status mudam.

## Boas práticas simples

- Separe front-end e back-end.
- Use JSON para trocar dados.
- Mantenha o back-end com rotas claras.
- Guarde regras de negócio no back-end.
- No front-end, trate mensagens de sucesso e erro.

## Dicas de evolução

- Criar rota de autenticação simples.
- Usar SQLite ou MySQL de verdade.
- Separar arquivo CSS e JS em `styles.css` e `app.js`.
- Criar páginas separadas para cadastro e listagem.
