-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  email TEXT
);

-- Tabela de coletas
CREATE TABLE IF NOT EXISTS coletas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabela de rotas
CREATE TABLE IF NOT EXISTS rotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coleta_id INTEGER,
  distancia_km REAL,
  tempo_min INTEGER,
  veiculo TEXT,
  status TEXT,
  FOREIGN KEY (coleta_id) REFERENCES coletas(id)
);
