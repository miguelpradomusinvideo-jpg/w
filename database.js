const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        const dbPath = path.join(__dirname, 'rockstar_accounts.db');
        
        // Verificar se o banco existe e está corrompido
        let needsReset = false;
        
        if (fs.existsSync(dbPath)) {
            try {
                // Tentar abrir o banco existente
                const testDb = new Database(dbPath);
                const tableInfo = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rockstar_accounts'").get();
                testDb.close();
                
                if (tableInfo) {
                    // Verificar se a tabela tem a coluna email
                    const testDb2 = new Database(dbPath);
                    try {
                        testDb2.prepare("SELECT email FROM rockstar_accounts LIMIT 1").get();
                    } catch (e) {
                        if (e.message.includes('no such column')) {
                            needsReset = true;
                            console.log('⚠️ Estrutura do banco antiga detectada. Resetando...');
                        }
                    }
                    testDb2.close();
                }
            } catch (e) {
                needsReset = true;
            }
        }
        
        // Se precisar resetar, deleta o arquivo antigo
        if (needsReset && fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log('🗑️ Banco de dados antigo removido!');
        }
        
        // Criar nova conexão
        this.db = new Database(dbPath);
        this.initTables();
    }

    initTables() {
        console.log('📦 Criando/verificando tabelas...');
        
        // Criar tabelas com a estrutura correta
        this.db.exec(`
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
        
        console.log('✅ Banco de dados inicializado com sucesso!');
    }

    // Salvar conta no formato EMAIL : SENHA : 2FA
    saveAccount(userId, email, senha, secret2FA, accountName = null) {
        const existing = this.getAccountByEmail(userId, email);
        
        if (existing) {
            const stmt = this.db.prepare(`
                UPDATE rockstar_accounts 
                SET senha = ?, secret_2fa = ?, account_name = ?, last_used = CURRENT_TIMESTAMP
                WHERE user_id = ? AND email = ?
            `);
            stmt.run(senha, secret2FA, accountName || email.split('@')[0], userId, email);
        } else {
            const stmt = this.db.prepare(`
                INSERT INTO rockstar_accounts (user_id, email, senha, secret_2fa, account_name) 
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(userId, email, senha, secret2FA, accountName || email.split('@')[0]);
        }
        
        this.logAction(userId, 'ACCOUNT_ADDED', email, 'Conta Rockstar adicionada/atualizada');
        return this.getAccountByEmail(userId, email);
    }

    // Obter todas as contas do usuário
    getUserAccounts(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT id, email, senha, secret_2fa, account_name, created_at, last_used 
                FROM rockstar_accounts 
                WHERE user_id = ?
                ORDER BY created_at DESC
            `);
            return stmt.all(userId) || [];
        } catch (error) {
            console.error('Erro ao buscar contas:', error);
            return [];
        }
    }

    // Obter conta por email
    getAccountByEmail(userId, email) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM rockstar_accounts 
                WHERE user_id = ? AND email = ?
            `);
            return stmt.get(userId, email);
        } catch (error) {
            console.error('Erro ao buscar conta por email:', error);
            return null;
        }
    }

    // Obter conta por ID
    getAccountById(accountId, userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM rockstar_accounts 
                WHERE id = ? AND user_id = ?
            `);
            return stmt.get(accountId, userId);
        } catch (error) {
            console.error('Erro ao buscar conta por ID:', error);
            return null;
        }
    }

    // Remover conta por ID
    removeAccount(accountId, userId) {
        try {
            const account = this.getAccountById(accountId, userId);
            if (account) {
                const stmt = this.db.prepare('DELETE FROM rockstar_accounts WHERE id = ? AND user_id = ?');
                stmt.run(accountId, userId);
                this.logAction(userId, 'ACCOUNT_REMOVED', account.email, 'Conta removida');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao remover conta:', error);
            return false;
        }
    }

    // Remover conta por email
    removeAccountByEmail(userId, email) {
        try {
            const account = this.getAccountByEmail(userId, email);
            if (account) {
                const stmt = this.db.prepare('DELETE FROM rockstar_accounts WHERE user_id = ? AND email = ?');
                stmt.run(userId, email);
                this.logAction(userId, 'ACCOUNT_REMOVED', email, 'Conta removida');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao remover conta por email:', error);
            return false;
        }
    }

    // Registrar código gerado
    logGeneratedCode(accountId, email, code) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO generated_codes (account_id, email, code) VALUES (?, ?, ?)
            `);
            stmt.run(accountId, email, code);
        } catch (error) {
            console.error('Erro ao registrar código:', error);
        }
    }

    // Obter histórico de códigos
    getCodeHistory(email, limit = 10) {
        try {
            const stmt = this.db.prepare(`
                SELECT code, generated_at, used FROM generated_codes 
                WHERE email = ? 
                ORDER BY generated_at DESC LIMIT ?
            `);
            return stmt.all(email, limit);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            return [];
        }
    }

    // Registrar log
    logAction(userId, action, email, details) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO logs (user_id, action, email, details) VALUES (?, ?, ?, ?)
            `);
            stmt.run(userId, action, email, details);
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    }

    // Buscar contas
    searchAccounts(userId, searchTerm) {
        try {
            const stmt = this.db.prepare(`
                SELECT id, email, senha, account_name, created_at 
                FROM rockstar_accounts 
                WHERE user_id = ? AND (email LIKE ? OR account_name LIKE ?)
                ORDER BY created_at DESC
            `);
            return stmt.all(userId, `%${searchTerm}%`, `%${searchTerm}%`);
        } catch (error) {
            console.error('Erro ao buscar contas:', error);
            return [];
        }
    }
}

module.exports = new DatabaseManager();