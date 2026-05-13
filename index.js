import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'whatsappcrm-secret';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());

async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const defaultPassword = bcrypt.hashSync('Password123!', 10);
    const initialUsers = [
      {
        id: 1,
        email: 'superadmin@example.com',
        fullName: 'Super Admin',
        businessName: 'Platform Management',
        phone: '+92 300 0000000',
        role: 'superadmin',
        passwordHash: defaultPassword,
        createdAt: new Date().toISOString(),
      },
    ];
    await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
  }
}

async function readUsers() {
  await ensureUsersFile();
  const file = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(file);
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function normalizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'WhatsApp CRM auth backend is running.' });
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password, businessName, phone } = req.body;
  if (!fullName || !email || !password || !businessName) {
    return res.status(400).json({ message: 'Full name, email, password, and business name are required.' });
  }

  const users = await readUsers();
  const existingUser = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1,
    email: email.toLowerCase(),
    fullName,
    businessName,
    phone: phone || '',
    role: email.toLowerCase() === 'superadmin@example.com' ? 'superadmin' : 'admin',
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  const token = createToken(newUser);
  return res.status(201).json({ token, user: normalizeUser(newUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const users = await readUsers();
  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = createToken(user);
  return res.json({ token, user: normalizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  return res.status(204).send();
});

app.get('/api/auth/me', async (req, res) => {
  const payload = await getUserFromToken(req);
  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const users = await readUsers();
  const user = users.find((item) => item.id === payload.id);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.json({ user: normalizeUser(user) });
});

app.listen(PORT, () => {
  console.log(`Authentication backend listening on http://localhost:${PORT}`);
  console.log('Default super admin login: superadmin@example.com / Password123!');
});
