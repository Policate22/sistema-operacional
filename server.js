const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'sua_chave_secreta_super_segura';

// Configuração do banco de dados
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabelas se não existirem
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS shortcuts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            position_x INTEGER,
            position_y INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Rotas de autenticação
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'Nome de usuário já existe' });
                }
                res.status(201).json({ id: this.lastID });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Usuário não encontrado' });
        }
        
        try {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
                res.json({ token });
            } else {
                res.status(403).json({ error: 'Senha incorreta' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

// Rotas de atalhos
app.get('/shortcuts', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM shortcuts WHERE user_id = ?',
        [req.user.id],
        (err, shortcuts) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(shortcuts);
        }
    );
});

app.post('/shortcuts', authenticateToken, (req, res) => {
    const { name, icon, position_x, position_y } = req.body;
    
    db.run(
        'INSERT INTO shortcuts (user_id, name, icon, position_x, position_y) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, name, icon, position_x, position_y],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});

app.put('/shortcuts/:id', authenticateToken, (req, res) => {
    const { name, icon, position_x, position_y } = req.body;
    
    db.run(
        'UPDATE shortcuts SET name = ?, icon = ?, position_x = ?, position_y = ? WHERE id = ? AND user_id = ?',
        [name, icon, position_x, position_y, req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Atalho não encontrado' });
            }
            res.json({ message: 'Atalho atualizado com sucesso' });
        }
    );
});

app.delete('/shortcuts/:id', authenticateToken, (req, res) => {
    db.run(
        'DELETE FROM shortcuts WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Atalho não encontrado' });
            }
            res.json({ message: 'Atalho removido com sucesso' });
        }
    );
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});