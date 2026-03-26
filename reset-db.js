const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'rockstar_accounts.db');

// Deletar arquivo antigo se existir
if (fs.existsSync(dbPath)) {
    console.log('🗑️  Deletando banco de dados antigo...');
    fs.unlinkSync(dbPath);
    console.log('✅ Banco de dados antigo removido!');
}

// Criar nova conexão
const db = new Database(dbPath);

console.log('📦 Criando novas tabelas...');

// Criar tabelas com a estrutura correta
db.exec(`
    -- Tabela de contas Rockstar
    CREATE TABLE IF NOT EXISTS rockstar_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        senha TEXT NOT NULL,
        secret_2fa TEXT NOT NULL,
        account_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME
    );

    -- Índice para busca rápida
    CREATE INDEX IF NOT EXISTS idx_user_email ON rockstar_accounts(user_id, email);

    -- Tabela de códigos gerados
    CREATE TABLE IF NOT EXISTS generated_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used INTEGER DEFAULT 0
    );

    -- Índice para generated_codes
    CREATE INDEX IF NOT EXISTS idx_code_email ON generated_codes(email, code);

    -- Tabela de logs
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        email TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Índice para logs
    CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
`);

console.log('✅ Banco de dados resetado com sucesso!');
console.log('📊 Estrutura das tabelas:');
console.log('   - rockstar_accounts (id, user_id, email, senha, secret_2fa, account_name, created_at, last_used)');
console.log('   - generated_codes (id, account_id, email, code, generated_at, used)');
console.log('   - logs (id, user_id, action, email, details, created_at)');
console.log('\n🎮 Agora você pode iniciar o bot com: npm start');

db.close();